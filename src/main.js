import { LuaFactory } from "./wasmoon.js";
import './swissgl.js'; const SwissGL = _SwissGL;

var touched = 0;

window.onload = function () {
    const factory = new LuaFactory();
    const cnv = document.getElementById("screen");
    if (!cnv) { showErr("couldn't get canvas"); return; }
    cnv.ontouchstart = function () {
        if (1<touched) {
            window.location.reload();
        }
        touched = touched+1;
        document.documentElement.requestFullscreen();
    }
    if (!factory) { showErr("can't create LuaFactory"); }
    const glsl = SwissGL(cnv);
    const data = new Uint8Array([255,0,0,0]);

    const dat = glsl({},{size:[4,1],format:'r8',data, tag:"dat"});
    glsl.loop(({time})=>{
        glsl.adjustCanvas();
        glsl({time, dat, Aspect:'cover',FP:`
            vec2 pos = vec2(XY);
            FOut = vec4(0);
            FOut = vec4(sin(length(XY)*vec3(30,30.5,31)
            -(time*6.)+atan(XY.x,XY.y)*3.),1);
            
            #define idx(i) dat(ivec2(i,0)).x
            FOut = vec4(idx(0),idx(1),idx(2),1)`});
    });
}
