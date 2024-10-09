import { LuaFactory } from "./wasmoon.js";
import './swissgl.js'; const SwissGL = _SwissGL;
import fnl from "./fennel.lua";
import fnlfmt from "./fnlfmt.fnl";
import init from "./init.fnl";
import MoonBounceDatabase from "./MoonBounceDatabase.txt";
// unfortunately necessary monkeypatch
// wasmoon uses setImmediate internally for some reason.
globalThis.setImmediate = globalThis.setTimeout;

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
      
      (local fennel (require :fennel))
      (set _G.fennel fennel)
      

  


(fn make-inspector [config]
    (local s {})
    (set s.in-queue [])
    (set s.out-queue [])
    (set s.input {})
    (set s.panels {})
    (local default-panels
           {:Browser
                {:state {:eq-seq?
                         (fn [a b]
                            (if (and a b (not (next a)) (not (next b))) true
                                (not (and a b (. a 1) (. b 1))) false
                                (not= (length a) (length b)) false
                                (accumulate [acc true i v (ipairs a)]
                                    (and acc (= v (. b i))))))}
                 :name :Browser
                 :run  (fn [s])
                 :sanitize 
                 (fn [s plug]
                     (local panel (. s.panels plug.name))
                     (when (and (not plug.loaded) panel)
                        (set plug.ct (s.E :div [:browser :container]))
                        
                        (set plug.miller (s.E :div [:browser :miller]))
                        (set plug.last-key-list (s.E :div [:browser :list]))
                        (plug.miller.appendChild (s.E :div [:browser :list-scroll]
                                                      plug.last-key-list))
                        (set plug.key-list (s.E :div [:browser :list]))
                        (plug.miller.appendChild (s.E :div [:browser :list-scroll]
                                                      plug.key-list))
                        (set plug.next-key-list (s.E :div [:browser :list]))
                        (plug.next-key-list.appendChild (s.E :div [:browser :entry]))
                        
                        (plug.miller.appendChild (s.E :div [:browser :list-scroll]
                                                      plug.next-key-list))
                        
                        (set plug.path-container (s.E "div" [:browser :path]))
                        (set plug.open-new-inspector-button (s.E "div" [:browser :path] "+"))
                        (plug.ct.appendChild plug.path-container)
                        (plug.ct.appendChild plug.miller)
                        (plug.ct.appendChild plug.open-new-inspector-button)
                        (panel.appendChild plug.ct)
                        (set plug.loaded true)
                        (set plug.in-queue []))
                     (when (and plug.loaded (= plug.name s.menu-idx))
                        (fn plug.open-new-inspector-button.onpointerup [e]
                            (table.insert plug.in-queue :open-inspector-at-path))
                        (set s.path (or s.path []))
                        (when (not (plug.state.eq-seq? s.path plug.last-path))
                          (comment DOM.log (fennel.view [s.path plug.last-path]))
                          (local path-elements
                              (icollect [i v (ipairs s.path)]
                                  (s.E :div [:browser :pathelement] (tostring v))))
                          (plug.path-container.remove)
                          (set plug.path-container (s.E :div [:browser :path]))
                          (plug.ct.insertBefore plug.path-container plug.miller)
                          (plug.path-container.appendChild (s.E :div [:browser :pathelement]
                                                                "(*)"))
                          (each [i v (ipairs path-elements)] 
                              (plug.path-container.appendChild (s.E :div [:browser :pathelement]
                                                                    ">"))
                              (plug.path-container.appendChild v))
                          (set plug.last-path (icollect [i v (ipairs s.path)] v)))
                        
                        (fn strify [x]
                            (case (type x)
                                :string x
                                :number (.. (tostring x) " (number)")))
                        (set plug.make-last-entry
                            (or plug.make-last-entry
                                (fn [name idx]
                                    (let [dv (s.E :div [:browser :entry] (strify name))]
                                        (fn dv.onpointerup [e]
                                            (table.remove s.path)
                                            (set s.browser-idx idx)
                                            (set s.key-idx name)
                                            (table.insert plug.in-queue :update-ui))
                                        dv))))
                        (set plug.make-entry
                            (or plug.make-entry
                                (fn [name idx]
                                    (let [dv (s.E :div [:browser :entry] (strify name))]
                                        (when (= idx s.browser-idx) (dv.classList.add :selected))
                                        (fn dv.onpointerup [e]
                                            (set s.browser-idx idx) (set s.key-idx name)
                                            (table.insert plug.in-queue :update-ui))
                                        dv))))
                        (set plug.make-next-entry
                            (or plug.make-next-entry
                                (fn [name idx]
                                    (let [ty (type name)
                                          dv (s.E :div [:browser :entry] (strify name))]
                                        (fn dv.onpointerup [e]
                                            (local nxt (. (s.look-up s.root s.path) s.key-idx))
                                            (when (= :table (type nxt))
                                                (table.insert s.path s.key-idx)
                                                (set s.browser-idx idx)
                                                (set s.key-idx name))
                                            (table.insert plug.in-queue :update-ui))
                                        dv))))
                                      
                        (set plug.lastkeys
                            (or plug.lastkeys
                                {:last {:keys {} :len 0} 
                                 :this {:keys {} :len 0} 
                                 :next {:keys {} :len 0}}))
                        (local lastkeys plug.lastkeys)
                        
                        (set s.browser-idx (or s.browser-idx 1))
                        (let [keys (icollect [k v (pairs (s.look-up s.root s.path))]
                                       (do (tset lastkeys.this.keys k nil) k))]
                            (if (or plug.update-ui (next lastkeys.this.keys) 
                                    (not= (length keys) lastkeys.this.len))
                                (do (table.sort keys)
                                    (local key-list plug.key-list)
                                    (set plug.key-list (s.E :div [:browser :list]))
                                    (comment DOM.log (fennel.view keys))
                                    (each [i v (ipairs keys)]
                                        (tset lastkeys.this.keys v true)
                                        (plug.key-list.appendChild (plug.make-entry v i)))
                                    (key-list.replaceWith plug.key-list)))
                            (do (each [k v (pairs lastkeys.this.keys)]
                                    (tset lastkeys.this.keys k nil))
                                (each [i v (ipairs keys)] (tset lastkeys.this.keys v true))
                                (set lastkeys.this.len (length keys))))
                        
                        (local this-path-key (table.remove s.path))
                        (local last-tbl (and this-path-key (s.look-up s.root s.path)))
                        (table.insert s.path this-path-key)
                        
                        (if (and last-tbl (= (type last-tbl) :table))
                            (let [keys (icollect [k v (pairs last-tbl)]
                                          (do (tset lastkeys.last.keys k nil) k))]
                                (set lastkeys.last.table? true)
                                (if (or plug.update-ui (next lastkeys.last.keys) 
                                        (not= (length keys) lastkeys.last.len))
                                    (do (table.sort keys)
                                        (local last-key-list plug.last-key-list)
                                        (set plug.last-key-list (s.E :div [:browser :list]))
                                        (each [i v (ipairs keys)]
                                            (tset lastkeys.last.keys v true)
                                            (plug.last-key-list.appendChild
                                                (plug.make-last-entry v i)))
                                        (last-key-list.replaceWith plug.last-key-list)))
                                (do (each [k v (pairs lastkeys.last.keys)]
                                        (tset lastkeys.last.keys k nil))
                                    (each [i v (ipairs keys)] (tset lastkeys.last.keys v true)) 
                                    (set lastkeys.last.len (length keys))))
                            (when lastkeys.last.table? (set lastkeys.last.table? false)
                                  (local last-key-list plug.last-key-list)
                                  (set plug.last-key-list (s.E :div [:browser :list]))
                                  (last-key-list.replaceWith plug.last-key-list)))
                              
                        (local next-tbl (. (s.look-up s.root s.path) s.key-idx))
                        (if (and next-tbl (= (type next-tbl) :table))
                            (let [keys (icollect [k v (pairs next-tbl)]
                                          (do (tset lastkeys.next.keys k nil) k))]
                                (set lastkeys.next.table? true)
                                (if (or plug.update-ui (next lastkeys.next.keys)
                                        (not= (length keys) lastkeys.next.len))
                                    (do (table.sort keys)
                                        (local next-key-list plug.next-key-list)
                                        (set plug.next-key-list (s.E :div [:browser :list]))
                                        (each [i v (ipairs keys)]
                                            (tset lastkeys.next.keys v true)
                                            (local k-type (type v))
                                            (local entry (plug.make-next-entry v i))
                                            (plug.next-key-list.appendChild entry))
                                        (next-key-list.replaceWith plug.next-key-list)))
                                (do (each [k v (pairs lastkeys.next.keys)]
                                        (tset lastkeys.next.keys k nil))
                                    (each [i v (ipairs keys)] (tset lastkeys.next.keys v true))
                                    (set lastkeys.next.len (length keys))))
                            (do (when lastkeys.next.table? (set lastkeys.next.table? false)
                                  (set lastkeys.next.val next-tbl)
                                  (local next-key-list plug.next-key-list)
                                  (set plug.next-key-list (s.E :div [:browser :entry]
                                                               (if (= (type next-tbl) :string) 
                                                                   (string.sub (fennel.view next-tbl) 2 -2)
                                                                   (fennel.view next-tbl))))
                                  (next-key-list.replaceWith plug.next-key-list))
                                (when (not= next-tbl lastkeys.next.val)
                                  (set lastkeys.next.val next-tbl)
                                  (local next-key-list plug.next-key-list)
                                  (set plug.next-key-list (s.E :div [:browser :entry] 
                                                               (if (= (type next-tbl) :string) 
                                                                   (string.sub (fennel.view next-tbl) 2 -2)
                                                                   (fennel.view next-tbl))))
                                  (next-key-list.replaceWith plug.next-key-list))))
                        (set plug.update-ui false)
                        
                        
                        (each [i v (ipairs plug.in-queue)]
                            (case v :open-plugins
                                    (do (comment DOM.log (fennel.view s.out-queue))
                                        (table.insert s.out-queue :open-plugins))
                                    :save-prsv
                                    (do (comment DOM.log (fennel.view s.out-queue))
                                        (table.insert s.out-queue :save-prsv))
                                    :update-ui
                                    (set plug.update-ui true)
                                    :open-inspector-at-path
                                    (do (table.insert s.out-queue :open-inspector-at-path))
                                    ))
                        (each [i _ (ipairs plug.in-queue)] (tset plug.in-queue i nil))))
                 :processInput 
                 (fn [s plug]
                     (when (and plug plug.loaded) nil))}
            :Meta {:state {}
                   :name :Meta
                   :run  (fn [s])
                   :sanitize 
                   (fn [s plug]
                       (local panel (. s.panels plug.name))
                       (when (and (not plug.loaded) panel)
                          (fn plug.random-str [len]
                              (->> (math.random 97 122) (string.char) 
                                   (fcollect [i 1 len]) (table.concat)))
                                 
                          (set plug.ct (s.E :div [:browser :container]))
                          (panel.appendChild plug.ct)
                          
                          (local open-plugin-list-btn 
                              (s.E "button" [:leftpadded] "Open Self-Inspector"))
                          (fn open-plugin-list-btn.onclick [e]
                            (comment set s.prsv.test "1")
                            (comment table.insert plug.in-queue :save-prsv)
                            (table.insert plug.in-queue :open-self)
                            )
                          (plug.ct.appendChild (s.E :div [] open-plugin-list-btn))
                          
                          (set plug.active-tags-header (s.E :div [:editor :tag-header]))
                          (plug.ct.appendChild (s.E :div [] plug.active-tags-header))
                          
                          (local entry-body (s.E :div [:hylc :body]))
                          (plug.ct.appendChild entry-body)
                          (set plug.out-ct (s.E :div [:editor :list :ct]))
                          (entry-body.appendChild plug.out-ct)
                          (set plug.out (s.E :div [:editor :list]))
                          (plug.out-ct.appendChild plug.out)
                          
                          (local code-editor (s.E :textarea [:hylc :editor]))
                          (set plug.code-editor code-editor)
                          (fn code-editor.onkeydown [e]
                              (local input code-editor.value)
                              (when (and (= e.key :Enter) e.ctrlKey (not= input ""))
                                  (local (f err) (load input nil :t))
                                  (if f (do (table.insert plug.in-queue
                                                          [:send-editor-chunk input])
                                            (set code-editor.value ""))
                                        (do (table.insert plug.in-queue
                                                          [:send-editor-load-err err])))
                                  (table.insert plug.in-queue code-editor.value)))
                          (plug.ct.appendChild code-editor)
                          (fn plug.make-code-entry [snip key i]
                              (local edit-btn (s.E :div [:editor :button] :edit))
                              (local run-btn (s.E :div [:editor :button] :run))
                              (local x-btn (s.E :div [:editor :button] :X))
                              (local button-menu (s.E :div [:editor :button-menu] x-btn edit-btn run-btn))
                              (local selected? (if (= key plug.current-snip) :selected-editor-entry nil))
                              (fn edit-btn.onpointerup [e]
                                  (table.insert plug.in-queue [:edit-snip key]))
                              (fn run-btn.onpointerup [e]
                                  (table.insert plug.in-queue [:run-snip key]))
                              (fn x-btn.onpointerup [e]
                                  (table.insert plug.in-queue [:del-snip i]))
                              (local dv (s.E :div [:editor :outer-entry selected?]
                                            (s.E :div [:editor :entry] snip)
                                            button-menu))
                              (when selected? (set plug.current-dom-entry dv))
                              dv)
                          (set plug.db {:tags (or (?. s.prsv.db :tags) {:scratch ["abcdef"]})
                                        :snips (or (?. s.prsv.db :snips) {"abcdef" "something went wrong"})
                                        :remove (fn [db tag i]
                                                (table.remove (. db.tags tag) i)
                                                (set db.changed? true))
                                        :add (fn [db tag input key]
                                                (comment DOM.log (or key new-key))
                                                (local new-key (or key (plug.random-str 6)))
                                                (when (not key)
                                                    (table.insert (. db.tags tag) new-key))
                                                (tset db.snips new-key input)
                                                (set db.changed? true)
                                                (set plug.finished-edit (if key true false))
                                                (set plug.current-snip nil))
                                        :update (fn [db] (set db.changed? true))})
                          (set plug.active-tags [:scratch])
                          (fn plug.active-tags.add [t key]
                              (case (. plug.db.tags key) yes
                                  (when (not (accumulate [acc false _ v (ipairs t)] 
                                                (or acc (= v key))))
                                      (table.insert t key)
                                      (set t.changed? true))))
                          (fn plug.active-tags.update? [t] 
                              (when t.changed? (set t.changed? false) (not t.changed?)))
                          (set plug.active-tags.changed? true)
                          (set plug.selected-tag :scratch)
                          (fn plug.make-tag-btn [tag selected?]
                              (let [dv (s.E :div [:editor :button (if selected? :selected)] tag)]
                                  (fn dv.onpointerup [e] (table.insert plug.in-queue [:select-tag tag]))
                                  dv))
                          (fn plug.make-tag-creator []
                              (let [dv (s.E :div [:editor :button] "+")]
                                  (fn dv.onpointerup [e]
                                      (table.insert plug.in-queue [:add-tag :does-nothing]))
                                  dv))
                          
                          (plug.db:update)
                          (set plug.loaded true)
                          (set plug.in-queue []))
                       (when plug.loaded
                          (local update? (or plug.db.changed? (plug.active-tags:update?)))
                          (when update?
                              (local tags plug.active-tags-header)
                              (set plug.active-tags-header (s.E :div [:editor :tag-header]))
                              (tags.replaceWith plug.active-tags-header)
                              (each [i v (ipairs plug.active-tags)]
                                  (plug.active-tags-header.appendChild
                                      (plug.make-tag-btn v (= v plug.selected-tag)))))
                          (local db plug.db)
                          (when update?
                              (set s.prsv.db {:tags plug.db.tags :snips plug.db.snips})
                              (table.insert plug.in-queue :save-prsv)
                              
                              (comment DOM.log :loaded)
                              (local out plug.out)
                              (set plug.out (s.E :div [:editor :list]))
                              (out.replaceWith plug.out)
                              (each [i key (ipairs (. db.tags plug.selected-tag))]
                                  (let [txt (. db.snips key)]
                                      (plug.out.appendChild (plug.make-code-entry txt key i))))
                              (when (not plug.finished-edit)
                                (comment plug.out.lastChild.scrollIntoView false)
                                (set plug.out-ct.scrollTop plug.out-ct.scrollHeight))
                              (when (or plug.finished-edit plug.current-dom-entry)
                                (when plug.current-dom-entry
                                  (plug.current-dom-entry.scrollIntoView false))
                                (set plug.current-dom-entry nil))
                              (set db.changed? false))
                          (each [i v (ipairs plug.in-queue)]
                              (case v :open-self
                                      (do (comment DOM.log (fennel.view s.out-queue))
                                          (table.insert s.out-queue :open-self))
                                      :save-prsv
                                      (do (comment DOM.log (fennel.view s.out-queue))
                                          (table.insert s.out-queue :save-prsv))
                                      :test-thing (plug.active-tags:add :whatever)
                                      [:select-tag tag]
                                      (do (set plug.active-tags.changed? true)
                                          (set plug.selected-tag tag))
                                      [:send-editor-chunk input]
                                      (do (db:add plug.selected-tag input plug.current-snip))
                                      [:send-editor-load-err err]
                                      (do (plug.out.appendChild (s.E :div [:editor :entry] err)))
                                      [:edit-snip key]
                                      (do (set plug.current-snip key)
                                          (set plug.code-editor.value (. db.snips key))
                                          (db:update))
                                      [:run-snip key]
                                      (do (local code (. db.snips key))
                                          (let [f (load code key :t)]
                                              (local (ok err) (pcall f s))
                                              (when (not ok)
                                                  (local dv (s.E :div [:editor :entry] err))
                                                  (fn dv.onpointerup [e] 
                                                      (table.insert plug.in-queue [:edit-snip key]))
                                                  (plug.out.appendChild dv))))
                                      [:del-snip i]
                                      (db:remove plug.selected-tag i)
                                      ))
                          (each [i _ (ipairs plug.in-queue)] (tset plug.in-queue i nil))))
                   :processInput 
                   (fn [s plug]
                       (when (and plug plug.loaded) nil))}})
                     
    (set s.plugins (or config.plugins {}))
    (each [k v (pairs default-panels)] (tset s.plugins k v))
    (fn state->ui []
        (fn E [ty classes? ...]
            (local children? [...])
            (let [el (DOM.document.createElement ty)]
                (when (and classes? (. classes? 1))
                    (each [_ v (ipairs classes?)]
                        (el.classList.add v)))
                (when (and children? (. children? 1))
                    (each [_ ch (ipairs children?)]
                        (if (= :string (type ch))
                            (el.appendChild (DOM.document.createTextNode ch))
                            (el.appendChild ch))))
                el))
        (fn F [...]
            (local children? [...])
            (let [f (DOM.document.createDocumentFragment)]
                (when (and children? (. children? 1))
                    (each [_ ch (ipairs children?)]
                        (f.appendChild 
                            (if (= :string (type ch))
                                (DOM.document.createTextNode ch)
                                ch))))
                f))
        (set s.E E)
        (set s.F F)
        (set s.style (E :style [] "
               
.hylc.editor {
  min-height: 150px;
  margin: 0px;
  resize: none;
  color: white;
  background-color: #333;
  padding: 6px;
  font-family: monospace;
  border: none;
  outline: none;
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
}

.editor.tag-header {
  display: flex;
  overflow-x: scroll;
}

.editor.list.ct {
  height: 100%;
  max-height: 100%;
  background-color: #1a1a1a;
  overflow-y: scroll;
  padding: 4px;
}
.editor.list {
  display: flex;
  flex-direction: column;
  row-gap: 4px;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}

.editor.button {
  user-select: none;
  padding: 4px;
  margin: 2px;
  background-color: #1a1a1a;
  border-radius: 6px;
  font-family: monospace;
  vertical-align: middle;
  text-align: center;
}
.editor.button.selected {
  background-color: #111
}
.editor.button-menu {
  position: absolute;
  top: 0px;
  right: 0px;
  height 20px;
  display: flex;
}
.editor.outer-entry {
  position: relative;
  background-color: #333;
  padding: 10px;
  border-radius: 10px;
}
.editor.outer-entry.selected-editor-entry {
  background-color: #222;
}

.editor.entry {
  font-family: monospace;
  white-space: pre;
  overflow-x: scroll;
}
                        
.browser.list {
}
.browser.list-scroll {
  width: 50%;
  overflow-y: scroll;
}
.browser.entry {
  font-family: monospace;
  //background-color: #1a1a1a;
}
.browser.entry.selected {
  background-color: #111;
}
.browser.path {
  background-color: #1a1a1a;
  display: flex;
  column-gap: 4px;
  align-items: stretch;
}
.browser.pathelement {
  //padding: 2px;
  font-family: monospace;
  background-color: #282828;
}
.browser.miller {
  //background-color: #1a1a1a;
  flex-grow: 1;
  display: flex;
  overflow-y: hidden;
}

.browser.container {
  display: flex;
  flex-direction: column;
  row-gap: 4px;
  padding: 10px;
  overflow: hidden;
  height: 100%;
}

.outline {
  outline: 2px solid red;
}

.leftpadded {
  margin: 8px;
  background-color: #3a3a3a;
  color: #ffffff;
  font-family: monospace;
}

.bar {
  height: 30px;
}

.hylc.top {
  user-select: none;
  padding: 2px;
  background-color: #1a1a1a;
  font-family: monospace;
  vertical-align: middle;
  text-align: center;
  line-height: 27px;
  border: none;
}

.hylc.menu {
  font-family: monospace;
  display: flex;
}

.menu-item {
  user-select: none;
  vertical-align: middle;
  text-align: center;
  padding: 6px;
  border-bottom: 2px solid grey;
}

.menu-item.selected {
  border-bottom: 2px solid #6495ED;
}

.hylc.body {
  flex-grow: 1;
  overflow-y: hidden;
}

.touch {
  touch-action: none;
}
.mb-viewport div {
  //touch-action: none;
  user-select: none;
}

.hylc.panel {
  height: 100%;
  max-height: 100%;
}

.hylc.panel.hidden {
  display: none;
}

            "))
        (fn make-bar [event-name classes ...]
            (table.insert classes 1 :touch)
            (let [dv (E :div classes ...)]
                (fn dv.onpointerdown [e]
                    (table.insert s.in-queue [event-name e.clientX e.clientY]))
                dv))
        (fn menu-item [event-name i ...]
            (local el (E :div [:menu-item] ...))
            (fn el.onpointerdown [e]
                (table.insert s.in-queue [:menu-select i event-name]))
            el)
        (fn make-menu [items]
            (local fg (F))
            (each [i name (ipairs items)]
                (fg.appendChild (menu-item name i name)))
            fg)
        (fn make-panels [items]
            (local fg (F))
            (each [_ name (ipairs items)]
                (local panel (E :div [:hylc :panel :hidden]))
                (tset s.panels name panel)
                (fg.appendChild panel))
            fg)
        
        (when (not s.container)
            (set s.container (E :div))
            (comment make-bar :resizer-down [:hylc :bar :resizer])
            (local header
                (F  (make-bar :bar-down [:hylc :bar :top] "Inspector")
                    (E  :div [:hylc :bar :menu]
                        (make-menu s.menu))))
            (set s.body-el (E :div [:hylc :body] (make-panels s.menu)))
            (s.container.appendChild header)
            (s.container.appendChild s.body-el)
            (comment DOM.log s.container))
        
        (when (not _G.__style-loaded)  
            (let [lst (DOM.document.getElementsByTagName :script)]
                (set _G.__style-loaded true)
                ((. (. lst (length lst)) :before) s.style)))
        
        (fn update-menu []
            (comment when s.menu changes re-call make-menu)
            (local menu-items (s.container.getElementsByClassName "menu-item"))
            (when s.last-input.menu-idx
                (each [i item (ipairs menu-items)]
                    (local cl item.classList)
                    (when (cl.contains :selected) (cl.remove :selected))
                    (if (= s.menu-idx item.lastChild.textContent)
                        (do (cl.add :selected)
                            (local panel (. s.panels item.lastChild.textContent))
                            (when (panel.classList.contains :hidden)
                                (panel.classList.remove :hidden)))
                        (do (local panel (. s.panels item.lastChild.textContent))
                            (when (and panel (not (panel.classList.contains :hidden)))
                                  (panel.classList.add :hidden)))))))
                                  
                                  
                                  
                                  
        (fn update-box [el color box]
            (el.setAttribute :style
                (.. "position: absolute;"
                    "display: flex;" "flex-direction: column;"
                    "left: " box.x "px;" "width: " box.w "px;"
                    "top: " box.y "px;" "height: " box.h "px;"
                    "max-height: " box.h "px;"
                    "background-color: " color ";"
                    "border-bottom-left-radius: 15px;"
                    "border-bottom-right-radius: 15px;")))
        ;; a lot of DOM/class updates happening here, seems to be slowing things down
        (update-menu)
        (update-box s.container "#282828" s)
        )
      
;;--------------------------------------------------------------------------------------------------------------------------------------------------
;;--------------------------------------------------------------------------------------------------------------------------------------------------
;;--------------------------------------------------------------------------------------------------------------------------------------------------

    (fn s.look-up [t path i]
        (let [idx (or i 1) key (. path idx)] 
            (if (= nil key) t (s.look-up (. t key) path (+ idx 1)))))
          
    (fn sanitize-state []
        (set s.root (or s.root config.root _G))
        (set s.prsv (or s.prsv config.prsv))
        (set s.pulses (or s.pulses {}))
        (fn dimensions []
            (local c config)
            (set [s.x s.y s.w s.h] 
              (case s {: x : y : w : h} [x y w h]
                      _ (or (and c.x c.y c.w c.h [c.x c.y c.w c.h])
                            [50 50 550 650]))))
        (fn menu []
            (set s.menu (or s.menu []))
            (table.sort s.menu)
            (set s.loaded-panels (or s.loaded-panels {}))
            (each [k v (pairs s.plugins)]
                
                (when (not (. s.loaded-panels k)) (table.insert s.menu k))
                (tset s.loaded-panels k true))
            (set s.menu-idx (or s.menu-idx (. s.menu 1))))
        (each [k plug (pairs s.plugins)]
            (local (ok err) (pcall plug.sanitize s plug))
            (when (not ok) (DOM.log err)))
        (do (dimensions) (menu) (set s.input (or s.input {}))))
      
    (fn process-input []
        (fn process-click []
            (when s.pulses.mouse-down (set s.pulses.mouse-down nil))
            (when (and s.input.x (not s.last-input.x)) 
                  (set s.pulses.mouse-down true)))
        (set s.last-input s.input)
        (set s.input {})
        (each [i event (ipairs s.in-queue)]
            (case event
              [:menu-select i event-name]
              (set s.input.menu-idx event-name)
              [:resizer-down x y]
              (do (set s.input.x x) 
                  (set s.input.y y)
                  (set s.selected :resizer))
              [:bar-down x y]
              (do (set s.input.x x)
                  (set s.input.y y)
                  (set s.selected :bar))
              [:move x y]
              (do (set s.input.x x)
                  (set s.input.y y))
              :up (set s.selected nil))
            (each [k plug (pairs s.plugins)] (when plug.processInput (plug.processInput s))))
        (each [i _ (ipairs s.in-queue)] (tset s.in-queue i nil))
        (process-click))
    (fn update-bar-and-resize []
        (when s.pulses.mouse-down
            (set s.last-click {:x s.input.x :y s.input.y})
            (set s.last-pos {:x s.x :y s.y})
            (set s.last-size {:w s.w :h s.h}))
        (case [s.last-click s.input]
              [{:x lx :y ly} {: x : y}]
              (do (case s.selected
                    :bar     (set [s.x s.y] [(- s.last-pos.x (- lx x)) (- s.last-pos.y (- ly y))])
                    :resizer (set [s.w s.h] [(- s.last-size.w (- lx x)) (- s.last-size.h (- ly y))])))))
    (fn update-menu []
        (when s.input.menu-idx
            (set s.menu-idx s.input.menu-idx)
            (comment set s.input.menu-idx nil)))
    (fn run-plugins []
        (each [k plugin (pairs s.plugins)]
            (when plugin.run (plugin.run s))))

    (fn s.process-frame [] 
        (sanitize-state)
        (process-input)
        (run-plugins)
        (update-bar-and-resize)
        (update-menu)
        (state->ui)
        )
    s)

;;--------------------------------------------------------------------------------------------------------------------------------------------------
;;++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
;;--------------------------------------------------------------------------------------------------------------------------------------------------

(do

  (let [lst (DOM.document.getElementsByTagName :script)
        sty (DOM.document.createElement :style)
        sty-txt ".mb-viewport {
                   position: absolute;
                   top:0; left:0; width: 100vw; height: 100vh;
                   overflow-x: scroll;
                   scroll-behavior: smooth;
                   scrollbar-color: #282828 transparent;
                }"]
      (sty.appendChild (DOM.document.createTextNode sty-txt))
      ((. (. lst (length lst)) :before) sty))
  
  (DOM.document.body.appendChild
    (let [vp (DOM.document.createElement :div)]
        (vp.classList.add "mb-viewport")
        vp))
  (local vp (DOM.document.querySelector ".mb-viewport"))

  
  
        
  (let [container {}]
    (local insps (or _G.insps []))
    (set _G.insps insps)
    (set container.insps insps)
    
    (fn DOM.document.onpointerrawupdate [e]
        (each [_ v (ipairs insps)]
            (when v.in-queue (table.insert v.in-queue [:move e.clientX e.clientY]))))
    (fn DOM.document.onpointerup [e]
        (each [_ v (ipairs insps)]
            (when v.in-queue (table.insert v.in-queue :up))))
  
    (local screenw DOM.window.innerWidth)
    (local screenh DOM.window.innerHeight)
    (local half-w (/ screenw 2))
    (fn set-viewport-terminal [w]
        (let [vpt (DOM.document.querySelector "#vpterm")]
            (if (= vpt.isConnected true)
                (do (set vpt.style.left (.. w :px))
                    (vpt.scrollIntoView))
                (let [vpt (DOM.document.createElement :div)]
                    (set vpt.id "vpterm")
                    (set vpt.style.left (.. (- w 1) :px))
                    (set vpt.style.top :1px)
                    (set vpt.style.width :1px)
                    (set vpt.style.height :1px)
                    (set vpt.style.position :absolute)
                    (vp.appendChild vpt)))))
    (fn append-inspector [opts]
        (local new-opts
          {:x (+ (* half-w (length insps)) (* half-w .05))
           :y (* screenh .05) :w (* half-w .9)  :h (* screenh .9)})
        (each [k v (pairs opts)] (tset new-opts k v))
        (table.insert insps
            (make-inspector new-opts))
        (when vp.isConnected (set-viewport-terminal (* (length insps) half-w))))
    
    (local raf (EVAL "requestAnimationFrame"))
    (fn container.clear-after [n]
        (for [i (+ n 1) (length container.insps)]
            (case (. container.insps i) insp
              (do (insp.container.remove)
                  (tset container.insps i nil)))))
    
    (local asts (fennel.parser (or DOM.window.localStorage.prsv-img "{}")))
    (local (prsv-ok prsv) (asts))
    (set container.prsv (if prsv-ok prsv {}))
    (append-inspector {:prsv container.prsv})
    
    (fn container.process-frames []
      (raf container.process-frames)
      (each [i v (ipairs insps)]
        (when (and vp.isConnected v.container (not v.container.isConnected))
            (vp.appendChild v.container))
        (v.process-frame)
        (when v.out-queue
          (each [j q (ipairs v.out-queue)]
              (case q [:open-console path] 
                      (let [new-root (v.look-up v.root path)]
                          (append-inspector {:root new-root}))
                      :open-self
                      (do (container.clear-after i)
                          (append-inspector {:root v :prsv container.prsv}))
                      :open-inspector-at-path
                      (do (container.clear-after i)
                          (local root (v.look-up v.root v.path))
                          (local plugs root.__plugins)
                          (append-inspector {:root root :prsv container.prsv :plugins plugs}))
                      :save-prsv (set DOM.window.localStorage.prsv-img (fennel.view container.prsv))
                      :download-prsv (DOM.dlstr DOM.window.localStorage.prsv-img)))
          (each [i _ (ipairs v.out-queue)] (tset v.out-queue i nil)))))
    (raf container.process-frames)
    container))
  




        `;

    ///////////////////////////////////////////
    //////////////// Setup Lua ////////////////
    ///////////////////////////////////////////
    
    const factory = new LuaFactory();
    if (!factory) { console.log("can't create LuaFactory"); return; }
    const lua = await factory.createEngine({injectObjects: true});
    await factory.mountFile("fennel.lua", fnl);
    await factory.mountFile("fnlfmt.fnl", fnlfmt);
    
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
      wasmoon: lua,
      new: (Tstr=>{
        let Constructor = window[Tstr];
        return (...a) => {
          let constructed = new Constructor(...a);
          return constructed;
        };
      }),
    });
    lua.global.set("EVAL",(s)=>eval(s));
    lua.global.set("twgl",twgl)
    lua.global.set("boot",localStorage.boot||boot);
    localStorage["prsv-img"] = localStorage["prsv-img"]||MoonBounceDatabase;
    
    lua.doString(`
      return require('fennel').install().eval(boot)`
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
