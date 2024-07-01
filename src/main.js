import { LuaFactory } from "./wasmoon.js";
import './swissgl.js'; const SwissGL = _SwissGL;
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

window.onload = async () => {
    const cnv = document.createElement("canvas");
    if (!cnv) { console.log("couldn't get canvas"); return; }
    cnv.style.width = "100vw";
    cnv.style.height = "100vh";
    document.body.appendChild(cnv);
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

      (fn init-console [cs]
        (set cs.styles [])
        (fn cs.styles.set [el opt]
          (for [i 1 (- (length opt) 1) 2]
            (tset el.style (. opt i) (. opt (+ i 1)))))
      
        (set cs.styles.float
          [:position :absolute
           :flex-direction :column
           :display :flex
           :top :350px
           :left :150px
           :width :100px
           :height :100px])
           
        (fn make-float [el] (cs.styles.set el cs.styles.float))
        (fn make-rounded [el px] 
          (set el.style.border-radius (or px :10px)))
  
               
        (fn color [el clr]
          (let [st el.style]
            (set st.background-color clr)))
         
        (set cs.history [])
        (set cs.container (cr :div))
        (set cs.hist-el (cr :div))
        (set cs.ta (cr :textarea))
        (set cs.str-queue [])
        
        (set cs.dimensions
          [:height :250px :width :450px])
        
        (set cs.styles.bar-style
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
        (fn cs.add-bar [ct]
          (local bar (cr :div))
          (set bar.textContent "Console")
          (cs.styles.set bar cs.styles.bar-style)
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
        
        (set cs.styles.hist-style
          [:background-color :#282828
             :flex-grow 1
             :overflow-y :auto
             :padding :3px
             :font-family :monospace])
        (fn cs.add-hist [ct]
          (local hist cs.hist-el)
          (cs.styles.set hist cs.styles.hist-style)
          (ct.appendChild hist))
        
        (set cs.styles.ipt-style
          [:flex-shrink 0
           :margin :0px
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
        (fn cs.add-input [ct]
          (local ipt cs.ta)
          (cs.styles.set ipt cs.styles.ipt-style)
          
          
          (fn ipt.onkeyup [e]
            (when (= e.key :Enter)
              (when e.ctrlKey
                (table.insert 
                  cs.str-queue ipt.value)
                (set ipt.value ""))))
          (ct.appendChild ipt))
        
        (set cs.styles.item-style 
          [:font-family :monospace
             :box-sizing  :border-box
             :white-space :pre
             :overflow-x  :auto
             :margin      :3px
             :padding     :6px])
        (fn cs.add-item [str]
          (DOM.log str)
          (local h cs.hist-el)
          (local div (cr :div))
          (set div.textContent str)
          (cs.styles.set div cs.styles.item-style)
          (h.appendChild div)
          (set h.scrollTop h.scrollHeight))
        
        (fn cs.append-to-history [txt]
          (when cs.attached-session
            (table.insert cs.attached-session txt))
          (table.insert cs.history txt))
          
        (fn cs.replay [seq]
          (icollect [_ v (ipairs seq) &into cs.str-queue] v))
        
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
        (cs.styles.set ct cs.dimensions)
        (cs.add-bar ct)
        (cs.add-hist ct)
        (cs.add-input ct)
        
        (body.appendChild cs.container))

      (set _G.console {})
      (init-console _G.console)
      (local default-prsv 
        {:hi "there"
         :listing {:DOM {:alert true
                         :dlstr true
                         :document true
                         :log true
                         :upstr true
                         :window true}
                   :EVAL true
                   :boot true
                   :download-prsv true
                   :prsv true
                   :save-prsv true
                   :shader false}
         :make-editor ["(local cr DOM.document.createElement)"
                       "cr"
                       "(local ap DOM.document.body.appendChild)"
                       "ap"
                       "(local ta (cr :textarea))"
                       "(set ta.style.position :absolute)"
                       "(ap ta)"
                       "(set ta.style.left :600px)"
                       "(set ta.style.top :100px)"
                       "(console.styles.set ta [:color :white :outline :none :background-color :#282828 :padding :3px])"
                       "(set console.attached-session nil)"]})
      (set _G.prsv
        (let [loc _G.DOM.window.localStorage]
          (_G.DOM.log loc.devimg)
          (if loc.devimg (_G.fennel.eval loc.devimg) default-prsv)))
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
             (_G.console.append-to-history txt)
             (.. txt " "))
           :onValues (fn [t] (_G.console.add-item
             (table.concat t "	")))}))`;

    ///////////////////////////////////////////
    //////////////// Setup Lua ////////////////
    ///////////////////////////////////////////
    
    const factory = new LuaFactory();
    if (!factory) { console.log("can't create LuaFactory"); return; }
    const lua = await factory.createEngine({injectObjects: true});
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
        //const dat = glsl({},{size:[1,1],format:'rgba32f',data, tag:"dat"});
        const t = time;
        glsl({t, // pass uniform 't' to GLSL
            Mesh:[10, 10],  // draw a 10x10 tessellated plane mesh
            // Vertex shader expression returns vec4 vertex position in
            // WebGL clip space. 'XY' and 'UV' are vec2 input vertex 
            // coordinates in [-1,1] and [0,1] ranges.
            VP:`XY*0.8+sin(t+XY.yx*2.0)*0.2,0,1`,
            // Fragment shader returns 'RGBA'
            FP:fp||`UV,0.5,1`
        });
    });
};
