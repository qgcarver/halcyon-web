(local fennel (require :fennel))
(macro first [x] '(. ,x 1))
;(set _G.test (assert-repl false))

(local builtin-modes (do
  (local cursor-test {})
  (var (c d) nil)
  (var (lc ld) nil)
  (var ratio 1)
  (var landscape true)
  (fn x-scale [x] (if landscape (* ratio x) x))
  (fn y-scale [y] (if landscape y (* y ratio)))
  (local xform {:x 0 :y 0 :zoom 1})
  (fn cursor-test.update [cmdbuf evts]
    (each [_ evt (ipairs evts)]
      ;; (set _G.out.innerHTML (fennel.view evts))
      (match evt
        [:resizeaspect r a] (set (ratio landscape) (values r a))
        [:touchstarted 0 clipx clipy] (do
          (set (lc ld) (values (x-scale clipx) (y-scale clipy))))
        [:touchmoved 0 clipx clipy] (do
          (comment set _G.out.innerHTML)
          (do 
            (fennel.view 
              {: ratio
               :clip [(x-scale clipx) (y-scale clipy)]
               :parts {: c : d : lc : ld}
               : xform}))
          (set (c d) (values (x-scale clipx) (y-scale clipy)))
          )
        [:touchended 0 clipx clipy]
          (set (c d lc ld) nil)))
    (when (and c d lc ld)
      (set xform.x (- xform.x (- c lc)))
      (set xform.y (+ xform.y (- d ld)))
      (set (lc ld) (values c d)))
    
    (table.insert cmdbuf 1)
    (table.insert cmdbuf xform.x)
    (table.insert cmdbuf xform.y)
    (table.insert cmdbuf 0))
  
  (local yield-demo {})

  (local pin-cross-demo {})
  (fn pin-cross-demo.update [cmdbuf evts]
    (when (not pin-cross-demo.init)
      (set pin-cross-demo.init true)
      (set pin-cross-demo.pins []))
    (fn distance [x y xx yy]
      (let [a (- xx x) b (- yy y)]
        (math.sqrt (+ (* a a) (* b b)))))
    (fn touch-evt? [evt] (case (first evt)
      "touchstarted" true "touchended" true "touchmoved" true))
    (comment local touch-evts (icollect [i v (ipairs evts)]
      (if (touch-evt? v) v)))
    (fn start-evt? [evt] (if (= (first evt) :touchstarted) evt))
    (fn filter [lst f] (icollect [i v (ipairs lst)]
      (if (f v) v)))
    (fn new-pin-ids [touch-start-evts pins]
      (icollect [_ [_ id x y] (ipairs touch-start-evts)] (do
        (var new? false)
        (each [_ pin (ipairs pins)]
          (if (< pin.domain (distance pin.x pin.y x y))
            (set new? true)))
        (if new? id))))
    (local starts 
      [[:touchended] [:touchstarted] [:touchstarted 0 2.4 2.2]])
    ;; (new-pin-ids [] [])
    {:start (filter starts start-evt?)}
    )
  {: cursor-test : pin-cross-demo}))


(set _G.once 
  (fn [] (match
      (xpcall builtin-modes.pin-cross-demo.update
        (fn [err] (.. err (fennel.traceback))))
    (true x)        (fennel.view x)
    (false x)  (fennel.view x))))


(var (mode mode-name) nil)
(fn set-mode [new-mode-name ...]
  (local builtin (. builtin-modes new-mode-name))
  (set (mode mode-name) (values
    (or builtin (require new-mode-name))
    new-mode-name))
  (comment when mode.activate
    ))

(set mode builtin-modes.cursor-test)

(var (update-thread handler) nil)
(fn game-update-and-render [cmdbuf events]
  (local evts (icollect [_ e (ipairs events)]
                (icollect [_ v (ipairs e)] v)))
  (fn resume [f] [(coroutine.resume f cmdbuf evts)])
  (var ret [])
  (when mode.update
    (when (not update-thread)
      (set update-thread (coroutine.create mode.update))
      (set ret (resume update-thread)))
    (local status (coroutine.status update-thread))
    (match (values status ret)
      ("suspended" [true name & args])
        (set handler
          ((. mode name) update-thread cmdbuf evts args))
      ("dead"   [true]) (set (update-thread handler) nil))))

(set _G.GUAR game-update-and-render)