(local fennel (require :fennel))
;(set _G.test (assert-repl false))

(var ratio 1)
(var inc 1)

;; make module loading system

;; demo a pin+cross demo with evts + shaders
;; (fn [] nil)
;; implement helpers for screen-space transformations within another demo

(fn game-update-and-render [cmdbuf evts]
  ; inputs are given in clip-space
  ; view-space is given as a ratio
  ; conversion to world-space is optional
  ; and implemented in a given mode.
  (each [i e (ipairs evts)]
    (local evt (icollect [i v (ipairs e)] v))
    (print (fennel.view evt))
    (match evt
      [:resize-aspect r] (set ratio r)
      [:touchstarted id] (do (error 1))
      [:touchstarted id clip-x clip-y] (do)
      [:touchended id clip-x clip-y] (do)
      [:touchmoved id clip-x clip-y] (do)
      [:touchcancel id] (do)
      [:test] :test))
  
  (set inc (+ inc 1))
  (table.insert cmdbuf 1)
  (table.insert cmdbuf 
    (* 0.2 (math.sin (/ inc 15))))
  (table.insert cmdbuf 0.2)
  (table.insert cmdbuf 0)

  ;; (table.insert cmdbuf 0.1)
  ;; (table.insert cmdbuf (* 0.5 ratio))
  ;; (table.insert cmdbuf 0.2)
  ;; (table.insert cmdbuf 0)
  )

(set _G.GUAR game-update-and-render)