import { LuaFactory } from "./wasmoon.js";
import './swissgl.js'; const SwissGL = _SwissGL;
import {EditorView, basicSetup} from "codemirror";
import {oneDark} from "@codemirror/theme-one-dark";
import {keymap} from "@codemirror/view";
import {indentWithTab} from "@codemirror/commands"
import {vim, Vim, getCM, CodeMirror} from "@replit/codemirror-vim"
import fnl from "./fennel.lua";
import init from "./init.fnl";


var touched = 1;
const _touchuse = touched;
const defaultiframesrc = `
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

const defaultiframecode = `
async () => {
    console.log(iframe)
    const document = iframe.contentDocument;
    const window = iframe.contentWindow;
    const cnv = document.getElementById("screen");
    if (!cnv) { console.log("couldn't get canvas"); return; }
    
    const factory = new LuaFact();
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
        glsl({time, rat, dat, Aspect:'cover',FP:\`
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
            \`});
    });
};
`


window.onload = () => {
    const defaultfs = {
        "host": {
            //"fennel.lua": fnl,
            "iframe": defaultiframesrc,
            "iframecode": defaultiframecode,
            "init.fnl": init,
            "bar": {
                "baz": "fan",
                "quux": "becker"
            },
            "foo": {}
        },
        "user": {}
    };
    const ls = window.localStorage;
    if (!ls.getItem("fs")) {
        ls.setItem("fs",JSON.stringify(defaultfs));
    }
    const currentfs = JSON.parse(ls.getItem("fs"));

    const dv = ()=> {
        const d = document.createElement("div");
        d.style.backgroundColor = "#404040";
        return d;
    };
    const ap = (el,x)=>el.appendChild(x);
    const editor = document.getElementById("editor");
    const cmwrap = document.createElement("div");
    cmwrap.className = "mirror";
    ap(editor,cmwrap);
    const cm = new EditorView({
        extensions:
          [vim(),oneDark,basicSetup,keymap.of([indentWithTab])],
        parent:cmwrap
    });
    let vimcm = getCM(cm);
    Vim.exitInsertMode(vimcm);
    Vim.handleKey(cm,"<Esc>");
    Vim.map("`","<Esc>","insert");


    globalThis.abc = cm;

    const code = cmwrap;
    code.style.display = "none";

    const fs = dv();
    fs.className = "code";
    fs.style.display = "inline"
    ap(editor,fs);

    fs.innerHTML = "";
    populateFS(fs,{"test": {
        "hello":{}
    },"cak":"gull"},[]);
    fs.innerHTML = "";
    populateFS(fs,currentfs,[]);

    const file = document.getElementById("fileselect");
    file.onchange = (e) => {
        const [name,dir] = indexfs(currentfs,currentfile);
        dir[name] = cm.state.doc.toString();
        updatePanel(e.target.value);
    }
    let cm_states = [];

    let currentfile;
    const save = document.getElementById("save");
    save.style.display = "none";
    save.onclick = (e) => {
        const [name,dir] = indexfs(currentfs,currentfile);
        dir[name] = cm.state.doc.toString();
        ls.setItem("fs",JSON.stringify(currentfs));
    }
    

    function indexfs(fsys,path) {
        const subpaths = path.split("/");
        const name = subpaths.pop();
        let dir = fsys;
        for (const sub of subpaths) {
            dir = dir[sub];
        }
        return [name,dir];
    };

    function updatePanel(optvalue) { 
        if (optvalue=="main") {
            code.style.display = "none"
            save.style.display = "none";
            fs.style.display = "inline";
        } else {
            code.style.display = "inline";
            save.style.display = "inline";
            fs.style.display = "none";
            const [name,dir] = indexfs(currentfs,optvalue); 

            cm.dispatch({changes: {
                from: 0, to: cm.state.doc.length,
                insert: dir[name]
            }});
            currentfile = optvalue;
        };
    }

    function openOrCreateTab(path, filename) {
        const pathtxt = path.reduce((acc,v)=>acc+v+"/","")+filename;
        let exists = false;
        for (const option of file.options) {
            if (option.value == pathtxt) {
                exists = pathtxt
            }
        }
        if (!exists) {
            const opt = document.createElement("option");
            opt.value = pathtxt;
            opt.text = filename;
            file.add(opt);
        }
        for (const option of file.options) {
            if(option.value == pathtxt) {
                option.selected = true;
                updatePanel(option.value);
            } else {
                option.selected = false;
            }
        }
    }

    function item(lvl,filename,ty) {
        const b = dv();
        b.style.padding = "5px";
        b.style.fontFamily = "monospace";
        b.style.fontSize = "large"
        let htm =
          "&nbsp;&nbsp;"
            .repeat(lvl.length)
            .concat(filename);
        console.log("ent");
        console.log(lvl);
        console.log(filename);
        if (ty=="dir") {
            htm = htm.concat("&#8628;");
        };
        b.innerHTML = htm; 
        return b;
    };

    function populateFS(filesys,obj,lvl) {
        for (const key in obj) {
            if (Object.hasOwnProperty.call(obj, key)) {
                const elm = obj[key];
                if(typeof(obj[key])=="string") {
                    console.log("test")
                    const file = item(lvl,key,"file");
                    file.onclick = e=>{
                        openOrCreateTab(lvl,key);
                    }
                    ap(filesys,file);
                } else {
                    ap(filesys,item(lvl,key,"dir"));
                    populateFS(
                        filesys,elm,
                        lvl.concat(key));
                }
            }
        }
    }
    
    const down = document.getElementById("download");
    down.onclick = (e) => {
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.style = "display: none";
        const blob = new Blob(
            [JSON.stringify(currentfs)],
            {type: "octet/stream"}
        );
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = "halcyon_save.txt";
        a.click();
        window.URL.revokeObjectURL(url);
    }
    const filestore = document.createElement("input");
    filestore.style.display = "none";
    filestore.type = "file";
    filestore.oninput = (e) => {
        console.log(e.target.files[0])
        const fr = new FileReader();
        fr.onload = (e)=>{
            const obj = JSON.parse(e.target.result);
            for (const key in obj) {
                if (Object.hasOwnProperty.call(obj, key)) {
                    currentfs[key] = obj[key];
                }
            }
            fs.innerHTML = "";
            populateFS(fs,currentfs,[]);
        }
        fr.readAsText(e.target.files[0]);
    }
    const upload = document.createElement("button");
    upload.className = "btn";
    upload.innerText = "^";
    upload.onclick = e =>{
        filestore.click();
    }
    const bar = document.getElementsByClassName("bar")[0];
    bar.appendChild(upload);
    
    const rel = document.getElementById("reload");
    let iframe;
    let LuaFact = LuaFactory;
    let fennel = fnl;
    rel.onclick = e=>{
        const container = document.body;
        if (iframe) {
            container.removeChild(iframe);
        }
        iframe = document.createElement("iframe");
        iframe.srcdoc = currentfs["host"]["iframe"];
        container.appendChild(iframe);
        const iframecode = currentfs["host"]["iframecode"]
        console.log(LuaFact)
        const fun = eval(iframecode);
        console.log(fun);
        iframe.contentWindow.onload = fun;
    }
    rel.click();
};
