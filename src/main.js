import { LuaFactory } from "./wasmoon.js";
import './swissgl.js'; const SwissGL = _SwissGL;
import fnl from "./fennel.lua";
import init from "./init.fnl";



var touched = 0;

window.onload = () => {
    const cnv = document.getElementById("screen");
    if (!cnv) { console.log("couldn't get canvas"); return; }
    (async () => {
        const factory = new LuaFactory();
        await factory.mountFile("fennel.lua", fnl);
        await factory.mountFile("init.fnl", init);
        if (!factory) { console.log("can't create LuaFactory"); return; }
        const lua = await factory.createEngine();
        await lua.doString(
            "require('fennel').install().dofile('init.fnl')"
        );
        const GUAR = lua.global.get("GUAR");
        const glsl = SwissGL(cnv);

        // TODO: handle touch events:
        //   should be placed into evts buf
        let evts = [];
        cnv.ontouchstart = (e) => {
            const touch = e.touches[0]
            evts.push(
                ['touchstarted', touch.clientX/cnv.height, touch.clientY/cnv.height]
            )
            // console.log("chuck")
            // if (1<touched) {
            //     window.location.reload();
            // }
            // touched = touched+1;
            // document.documentElement.requestFullscreen();
        };

        glsl.loop(({time})=>{
            glsl.adjustCanvas();
            const rat = cnv.width / cnv.height
            const cmds = [];
            evts.push(["resize-aspect",rat])
            GUAR(cmds,evts);
            evts = []
            const data = new Float32Array(cmds);
            const dat = glsl({},{size:[1,1],format:'rgba32f',data, tag:"dat"});
            glsl({time, dat, Aspect:'cover',FP:`
                vec2 pos = vec2(XY);
                FOut = vec4(0);
                FOut = vec4(sin(length(XY)*vec3(30,30.5,31)
                -(time*6.)+atan(XY.x,XY.y)*3.),1);
                FOut = vec4(fract(8.*length(XY)));
                
                #define idx(i) dat(ivec2(i,0))
                FOut += vec4(idx(0).x,idx(0).y,idx(0).z,1);
                vec4 thing = FOut;
                FOut = vec4(abs(XY.x-XY.y));
                float cmd = idx(0).x;
                if(cmd==1.) {
                    vec2 foo = idx(0).yz + XY;
                    FOut = vec4(abs(foo.y-foo.x));
                } else {
                    FOut = thing;
                };
                `});
        });
    })();
};
