import { LuaFactory } from "./wasmoon.js";
import './swissgl.js'; const SwissGL = _SwissGL;
import fnl from "./fennel.lua";
import init from "./init.fnl";



var touched = 1;

window.onload = () => {
    const container = document.getElementById("container");
    const iframe = document.createElement("iframe");
    iframe.srcdoc = `
    <html>
        <head>
            <style>
                * {
                    margin: 0px;
                    padding: 0px;
                    overflow: hidden;
                    /* box-sizing: border-box; */
                    background-color: #333;
                }
                body {
                    font-family: 'Helvetica Neue', Arial, sans-serif;
                    color: #ffffff;
                    font-weight: 300;
                }
                canvas {
                    width: 100vw;
                    height: 100vh;
                }
                .output {
                    position: absolute;
                    top: 20%;
                    left: 10%;
                    justify-self: center;
                }
            </style>
        </head>
        <body>
	        <div class="output" id="out">Testing</div>
            <canvas id="screen"></canvas>
        </body>
    </html>
    `;
    container.appendChild(iframe);
    

    iframe.contentWindow.onload = async () => {
        const document = iframe.contentDocument;
        const window = iframe.contentWindow;
        const cnv = document.getElementById("screen");
        if (!cnv) { console.log("couldn't get canvas"); return; }
        
        const factory = new LuaFactory();
        if (!factory) { console.log("can't create LuaFactory"); return; }
        await factory.mountFile("fennel.lua", fnl);
        await factory.mountFile("init.fnl", init);
        const lua = await factory.createEngine();
        await lua.doString(
            "require('fennel').install().dofile('init.fnl')"
        );
        const GUAR = lua.global.get("GUAR");
        lua.global.set("alert", window.alert);
        lua.global.set("out", document.getElementById("out"));
        const glsl = SwissGL(cnv);
        console.log(glsl);

        let evts = [];
        const dpr = self.devicePixelRatio;
        const getx = touch => 2*(touch.clientX*dpr-(cnv.width/2))/cnv.width;
        const gety = touch => 2*(touch.clientY*dpr-(cnv.height/2))/cnv.height;
        const id =   touch => (touch.identifier);
        const entry = type => touch => evts.push([type, id(touch), getx(touch), gety(touch)]);
        const changed = name => e => [...e.changedTouches].forEach(entry(name));
        window.ontouchcancel = changed("touchcancel");
        window.ontouchend    = changed("touchended");
        window.ontouchmove   = changed("touchmoved");
        // window.ontouchstart  = changed("touchstarted");
        window.ontouchstart = (e) => {
            // console.log("chuck");
            changed("touchstarted")(e);
            if (2==touched) {
                document.documentElement.requestFullscreen();
                // window.location.reload();
            }
            touched = touched+1;
            // document.getElementById("out").innerHTML = touched+"";
        };
        
        const once = lua.global.get("once");
        document.getElementById("out").innerText = once();

        glsl.loop(({time})=>{
            glsl.adjustCanvas();
            const rat = cnv.width > cnv.height ?
                cnv.width/cnv.height:
                cnv.height/cnv.width;
            const cmds = [];
            evts.push(["resizeaspect",rat,cnv.width>cnv.height])
            GUAR(cmds,evts);
            evts = []
            const data = new Float32Array(cmds);
            const dat = glsl({},{size:[1,1],format:'rgba32f',data, tag:"dat"});
            glsl({time, rat, dat, Aspect:'cover',FP:`
                vec2 pos = vec2(XY)*rat;
                
                #define idx(i) dat(ivec2(i,0))
                float cmd = idx(0).x;
                if(cmd==1.) {
                    vec2 foo = idx(0).yz + pos;
                    float d = length(foo);
                    d = sin(d*6. + time)/6.;
                    d = abs(d);
                    d = step(.1, d);
                    FOut = vec4(d, 0, 0.5, 1.);
                } else {
                    FOut = vec4(0.8);
                };
                `});
        });
    };

};