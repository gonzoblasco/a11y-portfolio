#!/usr/bin/env python3
import re, os, json
pairs = [
    ("#f4efe6", "#17140f"),
    ("#f4efe6", "#5d564b"),
    ("#f4efe6", "#cfc7b8"),
    ("#f4efe6", "#8a2f12"),
]

def luminance(hexc):
    r,g,b = [int(hexc[i:i+2],16)/255.0 for i in (1,3,5)]
    def chan(c):
        return c/12.92 if c <= 0.03928 else ((c+0.055)/1.055)**2.4
    r,g,b = map(chan,(r,g,b))
    return 0.2126*r+0.7152*g+0.0722*b

for fg,bg in pairs:
    L1 = luminance(fg)
    L2 = luminance(bg)
    cr = (max(L1,L2)+0.05)/(min(L1,L2)+0.05)
    print(f"{fg} on {bg}: {cr:.2f}")
