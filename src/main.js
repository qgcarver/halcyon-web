import { LuaFactory } from "./wasmoon.js";
import './swissgl.js'; const SwissGL = _SwissGL;
import {EditorView, basicSetup} from "codemirror";
import {oneDark} from "@codemirror/theme-one-dark";
import {keymap} from "@codemirror/view";
import {indentWithTab} from "@codemirror/commands";
import { foldService } from '@codemirror/language';
import {vim, Vim, getCM, CodeMirror} from "@replit/codemirror-vim"
import fnl from "./fennel.lua";
import init from "./init.fnl";
// unfortunately necessary monkeypatch
// wasmoon uses setImmediate internally for some reason.
globalThis.setImmediate = globalThis.setTimeout;
    


const foldingOnIndent = foldService.of((state, from, to) => {
    const line = state.doc.lineAt(from) // First line
    const lines = state.doc.lines // Number of lines in the document
    const indent = line.text.search(/\S|$/) // Indent level of the first line
    let foldStart = from // Start of the fold
    let foldEnd = to // End of the fold

    // Check the next line if it is on a deeper indent level
    // If it is, check the next line and so on
    // If it is not, go on with the foldEnd
    let nextLine = line
    while (nextLine.number < lines) {
        nextLine = state.doc.line(nextLine.number + 1) // Next line
        const nextIndent = nextLine.text.search(/\S|$/) // Indent level of the next line

        // If the next line is on a deeper indent level, add it to the fold
        if (nextIndent > indent) {
            foldEnd = nextLine.to // Set the fold end to the end of the next line
        } else {
            break // If the next line is not on a deeper indent level, stop
        }
    }

    // If the fold is only one line, don't fold it
    if (state.doc.lineAt(foldStart).number === state.doc.lineAt(foldEnd).number) {
        return null
    }

    // Set the fold start to the end of the first line
    // With this, the fold will not include the first line
    foldStart = line.to

    // Return a fold that covers the entire indent level
    return { from: foldStart, to: foldEnd }
})

window.onload = () => {
    const cnv = document.createElement("canvas");
    if (!cnv) { console.log("couldn't get canvas"); return; }
    cnv.style.width = "100vw";
    cnv.style.height = "100vh";
    document.body.appendChild(cnv);
    const cmwrap = document.createElement("div");
    cmwrap.className = "mirror";
    //ap(editor,cmwrap);
    const cm = new EditorView({
        extensions:
          [vim(),oneDark,basicSetup,keymap.of([indentWithTab]),foldingOnIndent],
        parent:cmwrap
    });
    let vimcm = getCM(cm);
    Vim.exitInsertMode(vimcm);
    Vim.handleKey(cm,"<Esc>");
    Vim.map("`","<Esc>","insert");
    globalThis.abc = cm;
    const code = cmwrap;
    //code.style.display = "none";
    //dir[name] = cm.state.doc.toString();

    ///////////////////////////////////////////
    /////////////// Fennel Boot ///////////////
    ///////////////////////////////////////////
    
    const boot = `
      (set _G.fennel (require :fennel))
        
      (local doc _G.DOM.document)
      (local body doc.body)
      (local window doc.window)
      (local cr doc.createElement)

      (local prom (EVAL "(f)=>new Promise(f)"))

      (fn set-style [el opt]
        (for [i 1 (- (length opt) 1) 2]
          (tset el.style (. opt i) (. opt (+ i 1)))))
      
      (local float-style
        [:position :absolute
         :flex-direction :column
         :display :flex
         :top :350px
         :left :150px
         :width :100px
         :height :100px])
         
      (fn make-float [el] (set-style el float-style))
      (fn make-rounded [el px] 
        (set el.style.border-radius (or px :10px)))

             
      (fn color [el clr]
        (let [st el.style]
          (set st.background-color clr)))
         
      (fn init-console [cs]
        (set cs.history [])
        (set cs.container (cr :div))
        (set cs.hist-el (cr :div))
        (set cs.ta (cr :textarea))
        (set cs.str-queue [])
        
        (set cs.dimensions
          [:height :250px :width :450px])
        
        (fn cs.add-bar [ct]
          (local bar (cr :div))
          (set bar.textContent "Console")
          (set-style bar 
            [:background-color :#1a1a1a
             :font-family :monospace
             :min-height :25px
             :flex-shrink 0
             :padding :2px
             :text-align     :center
             :vertical-align :middle
             :line-height :25px
             :border :none
             :border-bottom-width :0px
             :border-bottom-color :#444
             :border-bottom-style :solid])
          (set bar.ontouchstart (fn [e]
            (let [t (. e.touches 1)]
              (set cs.last-x t.clientX)
              (set cs.last-y t.clientY))))
          (set bar.ontouchmove (fn [e]
            (e.preventDefault)
            (let [t (. e.touches 1)]
              (set ct.style.left
                (.. (- ct.offsetLeft 
                       (- cs.last-x t.clientX))
                    :px))
              (set ct.style.top
                (.. (- ct.offsetTop 
                       (- cs.last-y t.clientY))
                    :px))
              (set cs.last-x t.clientX)
              (set cs.last-y t.clientY))))
          (ct.appendChild bar))
      
        (fn cs.add-hist [ct]
          (local hist cs.hist-el)
          (set-style hist 
            [:background-color :#282828
             :flex-grow 1
             :overflow-y :auto
             :padding :3px
             :font-family :monospace])
          (ct.appendChild hist))

        (fn cs.add-input [ct]
          (local ipt cs.ta)
          (set-style ipt
            [:flex-shrink 0
             :resize :none
             :min-height :1em
             :color :white
             :background-color :#333
             :min-height :60px
             :box-sizing :border-box
             :padding :6px
             :font-family :monospace
             :border :none
             :border-top-width :1px
             :border-top-color :#444
             :border-top-style :solid
             :outline :none
             :border-bottom-left-radius :10px
             :border-bottom-right-radius :10px])
          
          
          (fn ipt.onkeyup [e]
            (when (= e.key :Enter)
              (when e.ctrlKey
                (table.insert 
                  cs.str-queue ipt.value)
                (set ipt.value ""))))
          (ct.appendChild ipt))

        (fn cs.add-item [str]
          (DOM.log str)
          (local h cs.hist-el)
          (local div (cr :div))
          (set div.textContent str)
          (set-style div
            [:font-family :monospace
             :box-sizing  :border-box
             :white-space :pre
             :overflow-x  :auto
             :margin      :3px
             :padding     :6px])
          (h.appendChild div))
        
        (fn cs.get-input [res]
          (if res
            (let [req DOM.window.requestIdleCallback]
              (if (next cs.str-queue)
                  (res (table.remove cs.str-queue 1))
                  (req (fn [] (cs.get-input res)))))
            (prom (fn [res] (cs.get-input res)))))

        
        (local ct cs.container)
        (make-float ct)
        (make-rounded ct)
        (set-style ct cs.dimensions)
        (cs.add-bar ct)
        (cs.add-hist ct)
        (cs.add-input ct)

        
        (body.appendChild cs.container))

      (set _G.console {})
      (init-console _G.console)
      (set _G.prsv
        (let [loc _G.DOM.window.localStorage]
          (_G.fennel.eval (or loc.devimg "{}"))))
      (set _G.save-prsv (fn []
        (let [loc _G.DOM.window.localStorage
              str (_G.fennel.view _G.prsv)]
          (set loc.devimg str))))
      (set _G.download-prsv (fn [name]
        (let [loc _G.DOM.window.localStorage]
          (_G.DOM.dlstr loc.devimg 
                        (or name :devimg)))))
      (local abc 100)
      (_G.DOM.alert 
        (_G.fennel.repl 
          {:readChunk (fn []
             (local rd (_G.console.get-input))
             (local txt (rd:await))
             (_G.console.add-item (.. "> " txt))
             (.. txt " "))
           :onValues (fn [t] (_G.console.add-item
             (table.concat t "\t")))}))`

    ///////////////////////////////////////////
    //////////////// Setup Lua ////////////////
    ///////////////////////////////////////////
    
    const factory = new LuaFactory();
    if (!factory) { console.log("can't create LuaFactory"); return; }
    const lua = await factory.createEngine();
    await factory.mountFile("fennel.lua", fnl);
    
    const uploadString = ()=>{
      const input = document.createElement("input");
      input.setAttribute("type","file");
      input.click();
      return new Promise((res,rej) => {
      	input.onchange = e => {
      	  var fr = new FileReader();
          fr.onload = file => res(file.target.result);
          fr.readAsText(e.target.files[0]);
      	};
      });
    };
    
    const downloadString = (str,name) => {
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.style = "display: none";
        const blob = new Blob(
            [str],
            {type: "octet/stream"}
        );
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = name;
        a.click();
        window.URL.revokeObjectURL(url);
    }
    lua.global.set("DOM",{document,window,
      dlstr: downloadString,
      upstr: uploadString,
      alert: a=>window.alert(a),
      log: console.log,
    });
    lua.global.set("EVAL",(s)=>eval(s));
    lua.global.set("boot",localStorage.boot||boot);
    
    lua.doString(`
      return require('fennel').eval(boot)`
    );
    

    ///////////////////////////////////////////
    ///////////// Pretty Pictures /////////////
    ///////////////////////////////////////////

    
    const glsl = SwissGL(cnv);
    
    let evts = [];
    const dpr = self.devicePixelRatio;
    const getx = touch => 2*(touch.clientX*dpr-(cnv.width/2))/cnv.width;
    const gety = touch => 2*(touch.clientY*dpr-(cnv.height/2))/cnv.height;
    const id =   touch => (touch.identifier);
    const entry = type => touch => evts.push([type, id(touch), getx(touch), gety(touch)]);
    const changed = name => e => [...e.changedTouches].forEach(entry(name));
    window.ontouchcancel = changed("touchcancel");
    window.ontouchend    = changed("touchended");
    window.ontouchmove   = e=> {
      e.preventDefault(); changed("touchmoved")(e);
    };
    
    glsl.loop(async ({time})=>{
        glsl.adjustCanvas();
        const rat = cnv.width > cnv.height ?
            cnv.width/cnv.height:
            cnv.height/cnv.width;
        const cmds = [1,0.1,0.3,1];
        evts.push(["resizeaspect",rat,cnv.width>cnv.height])
        //GUAR(cmds,evts);
        evts = [];
        const fp = lua.global.get("shader")
        const data = new Float32Array(cmds);
        const dat = glsl({},{size:[1,1],format:'rgba32f',data, tag:"dat"});
        glsl({time, rat, dat, Aspect:'cover',FP:fp||`
            vec2 pos = vec2(XY)*rat;
            
            #define idx(i) dat(ivec2(i,0))
            float cmd = idx(0).x;
            if(cmd==1.) {
                vec2 foo = idx(0).yz + pos;
                float d = length(foo);
                d = sin(d*6. + time)/6.;
                d = abs(d);
                d = step(.1, d);
                FOut = vec4(d, 0, .5, 0);
            } else {
                FOut = vec4(0.8);
            };
            `});
    });
};
