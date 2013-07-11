define([], function() {
    return {
        make: function(x, y) {
            return {
                x: x,
                y: y
            }
        },
        mad: function(va, fct, vb) {
            return {
                x: va.x+fct*vb.x,
                y: va.y+fct*vb.y
            };
        },
        norm: function(va) {
            var m = Math.sqrt(va.x*va.x+va.y*va.y);
            return {
                x: va.x/m,
                y: va.y/m
            }
        },
        mag: function mag(va) {
            return Math.sqrt(va.x*va.x+va.y*va.y);
        },
        sc: function sc(va, fct) {
            return {
                x: va.x*fct,
                y: va.y*fct
            }
        },
        inv: function(va) {
            if (!(va.x && va.y)) {
                return va;
            }
            return {
                x: 1/va.x,
                y: 1/va.y
            }
        },
        lim: function(va, value) {
            var m = mag(va);
            if(m > value) {
                return sc(va, value/m);
            }
            return va;
        },
        asm: function(va, value) {
            var m = mag(va);
            if (m < value) {
                return sc(va, value/m);
            }
            return va;
        }
    }
});