import React, { useEffect, useMemo, useState } from "React";
import "./App.css"; //  className="toolbar"
import style from "./style/index.scss";
import { SYMBOL, MODE } from './canvas/util';
import { useObjSize, useDrawing, makeLine, makeCircle, makeRect, makePolygon, makeOperateCircle } from './canvas/Draw'
import useRange from "./canvas/Range/useRange";

// TODO: 文字是否Dom还是canvas展示？如何设置文字展示锚点位置？
export default function App() {
    // PS: let canvas 定义的对象；在useEffect可能无法获取到
    const [ curMode, setModeType ] = useState(MODE.NONE);
    const [ canvas, setCanvas ] = useState(null);
    const [ current, size ] = useObjSize(canvas);
    const [ startDrawing, endDrawing ] = useDrawing(canvas);
    const [ isRange, setRangeStatus ] = useRange(canvas);

    const addSymbol = (type)=>{
        switch(type){
            case SYMBOL.LINE:
                let line = makeLine([0, 0, 200, 200], {
                    id: Date.now(),
                    left: 100,
                    top: 100,
                    stroke: "blue",
                    strokeWidth: 3
                });
                canvas.add(line);
                break;
            case SYMBOL.POLYGON:
                // let path = new fabric.Path('M 0 0 L 200 100 L 170 200 z');
                // path.set({ left: 120, top: 120,fill:'red' });
                // canvas.add(path);
                let polygon = makePolygon([
                    {x: 0, y: 0},
                    {x: 100, y: 20},
                    {x: 200, y: 120},
                    {x: 150, y: 140},
                ], {
                    left: 0,
                    top: 0,
                    fill:'red',
                    objectCaching: false,
		            transparentCorners: false,
                });
                canvas.add(polygon);
                break;
            case SYMBOL.RECTANGLE:
                canvas.add(makeRect({
                    left: 200, 
                    top: 200,
                    fill: "green",
                    width: 200,
                    height: 200,
                    id: Date.now(),
                    name: "这是一个气泡标题"
                }));
                break;
            case SYMBOL.CIRCLE:
                canvas.add(makeCircle({
                    left: 100, 
                    top: 100,
                    fill: "red",
                    radius: 100,
                    id: Date.now(),
                    name: "这是一个气泡标题"
                }));
                break;
            case SYMBOL.POLYLINE:
                let polyline = new fabric.Polyline([
                    {x: 0, y: 0},
                    {x: 0, y: 150},
                    {x: 150, y: 150},
                    {x: 150, y: 230}
                ],{
                    left: 100,
                    top: 100,
                    fill: "transparent",
                    stroke: "red",
                    strokeWidth: 3,
                    id: Date.now(),
                    objectCaching: false,
		            transparentCorners: false,
                })
                canvas.add(polyline);
                break;
            default:
                break;
        }
    }
    const toggleMode = (mode, shape) => {
        if(mode in MODE) setModeType(`${mode}_${shape}`);
    }
    useEffect(()=>{
        setCanvas(new fabric.Canvas("canvas"));
    }, [])
    
    const drawing = (symbol)=>{
        startDrawing(symbol)
    }

    useEffect(()=>{
        canvas && (canvas.selection = false);
        window.onkeydown = function(ev){
            const {keyCode, key} = ev;
            if(keyCode === 8 && key === "Backspace") {
                canvas.remove(current)
            }
        }
        function polygonPositionHandler(dim, finalMatrix, fabricObject) {
            let x = (fabricObject.points[this.pointIndex].x - fabricObject.pathOffset.x);
            let y = (fabricObject.points[this.pointIndex].y - fabricObject.pathOffset.y);
            console.log(this.pointIndex, fabricObject.points[this.pointIndex].x, fabricObject.pathOffset.x);
            console.log(this.pointIndex, fabricObject.points[this.pointIndex].y, fabricObject.pathOffset.y);
            return fabric.util.transformPoint( { x, y },
                fabric.util.multiplyTransformMatrices(
                    fabricObject.canvas.viewportTransform,
                    fabricObject.calcTransformMatrix()
                )
            );
        }
        function actionHandler(eventData, transform, x, y) {
            var polygon = transform.target,
                currentControl = polygon.controls[polygon.__corner],
                mouseLocalPosition = polygon.toLocalPoint(new fabric.Point(x, y), 'center', 'center'),
            polygonBaseSize = polygon._getNonTransformedDimensions(),
                    size = polygon._getTransformedDimensions(0, 0),
                    finalPointPosition = {
                        x: mouseLocalPosition.x * polygonBaseSize.x / size.x + polygon.pathOffset.x,
                        y: mouseLocalPosition.y * polygonBaseSize.y / size.y + polygon.pathOffset.y
                    };
            polygon.points[currentControl.pointIndex] = finalPointPosition;
            return true;
        }
        function anchorWrapper(anchorIndex, fn) {
          return function(eventData, transform, x, y) {
            var fabricObject = transform.target,
                absolutePoint = fabric.util.transformPoint({
                    x: (fabricObject.points[anchorIndex].x - fabricObject.pathOffset.x),
                    y: (fabricObject.points[anchorIndex].y - fabricObject.pathOffset.y),
                }, fabricObject.calcTransformMatrix()),
                actionPerformed = fn(eventData, transform, x, y),
                newDim = fabricObject._setPositionDimensions({}),
                polygonBaseSize = fabricObject._getNonTransformedDimensions(),
                newX = (fabricObject.points[anchorIndex].x - fabricObject.pathOffset.x) / polygonBaseSize.x,
                    newY = (fabricObject.points[anchorIndex].y - fabricObject.pathOffset.y) / polygonBaseSize.y;
            fabricObject.setPositionByOrigin(absolutePoint, newX + 0.5, newY + 0.5);
            return actionPerformed;
          }
        }
        if (current && (current.get("type") === SYMBOL.POLYLINE.toLowerCase()|| current.get("type") === SYMBOL.POLYGON.toLowerCase())) {
            canvas?.on("mouse:dblclick", ()=>{
                current.cornerStyle = 'circle';
                current.cornerColor = 'blue';
                current.hasBorders  = false;
                current.edit        = true;
                current.controls = current.points.reduce(function(acc, point, index) {
                    acc['p' + index] = new fabric.Control({
                        positionHandler: polygonPositionHandler,
                        actionHandler: anchorWrapper(index > 0 ? index - 1 : (current.points.length - 1), actionHandler),
                        actionName: 'modifyPolygon',
                        pointIndex: index
                    });
                    return acc;
                }, {});
                canvas.requestRenderAll();
            })
        }
        return ()=>{
            if(current) {
                current.cornerStyle = fabric.Object.prototype.cornerStyle;
                current.cornerColor = fabric.Object.prototype.cornerColor;
                current.controls = fabric.Object.prototype.controls;
                current.edit = false;
                current.hasBorders = true;
                canvas.requestRenderAll();
            }
            canvas?.off("mouse:dblclick");

        }
    }, [canvas, current])

    useEffect(()=>{
        switch(curMode){
            case `${MODE.DRAW}_${SYMBOL.POLYGON}`:
                startDrawing(new fabric.Line([0, 0, 0, 0], {
                    id: Date.now(),
                    left: 0,
                    top: 0,
                    stroke: "blue",
                    strokeWidth: 3
                }))
                break;
            default: 
                endDrawing();
                break;
        }
    }, [canvas, curMode])

    let getAll = ()=>{
        console.log('getAll');
        // let element = document.elementFromPoint(700, 400);
        // console.log(element)
    }
    
    return (
        <div className={`${style["flex-inline-item"]}`}>
            <div className={`${style["flex"]} ${style["flex-column"]}`}>
                <button onClick={() => addSymbol(SYMBOL.LINE)}>Add Line</button>
                <button onClick={() => addSymbol(SYMBOL.CIRCLE)}>Add Circle</button>
                <button onClick={() => addSymbol(SYMBOL.RECTANGLE)}>Add Rect</button>
                <button onClick={() => addSymbol(SYMBOL.POLYGON)}>Add Polygon</button>
                <button onClick={() => addSymbol(SYMBOL.POLYLINE)}>Add Polyline</button>
            </div>
            <div className={`${style["flex-inline-item"]} ${style["flex-column"]}`}>
                <div className={style.toolbar}>
                    <div className={style.toolbar__draw}>
                        <button onClick={() => drawing(SYMBOL.RECTANGLE)}>Draw Rect</button>
                        <button onClick={() => drawing(SYMBOL.CIRCLE)}>Draw Circle</button>
                        <button onClick={() => drawing(SYMBOL.LINE)}>Draw Line</button>
                        <button onClick={() => drawing(SYMBOL.POLYLINE)}>Draw Polyline</button>
                        <button onClick={() => drawing(SYMBOL.POLYGON)}>Draw Polygon</button>
                        <button onClick={() => toggleMode(MODE.EDIT)}>Edit</button>
                        <button onClick={() => setRangeStatus(true)}>Start Machine</button>
                        <button onClick={() => setRangeStatus(false)}>Close Machine</button>
                    </div>
                </div>
                <div className={style.toolbar}>
                    <div className={style.toolbar__draw}>
                        <button onClick={getAll}>getAll</button>
                    </div>
                </div>
                <div>{size && `${size.width}, ${size.height}`}</div>
                <canvas id="canvas" width="500" height="400" className={style.canvas}></canvas>
            </div>
        </div>
        
    );
}
