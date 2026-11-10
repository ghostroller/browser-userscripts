// ==UserScript==
// @name         哔哩哔哩 - 链接预览卡片
// @namespace    https://github.com/ghostroller/monkey-scripts-collection
// @version      1.1.3
// @description  预览评论和视频简介中的视频、影视、图文、直播及用户主页链接，可切换常驻卡片、鼠标悬浮卡片或同时显示。
// @match        https://www.bilibili.com/opus/*
// @match        https://www.bilibili.com/video/*
// @match        https://t.bilibili.com/*
// @match        https://space.bilibili.com/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @connect      www.bilibili.com
// @connect      live.bilibili.com
// @updateURL    https://raw.githubusercontent.com/ghostroller/browser-userscripts/main/scripts/bilibili-link-cards.user.js
// @downloadURL  https://raw.githubusercontent.com/ghostroller/browser-userscripts/main/scripts/bilibili-link-cards.user.js
// ==/UserScript==

(function () {
    "use strict";

    // B 站动态页等级图标 / 用户卡样式（2026-10-21）。

    // 来源：s1.hdslb.com/bfs/static/2233-monorepo/dyn-home/static/index.63fa13e0.css / index.c648f6cd.js

    // 播放量、弹幕图标：公开播放页 https://www.bilibili.com/video/BV11sHx6qEWg/

    const VIDEO_HOSTS = new Set(["www.bilibili.com", "bilibili.com"]);

    const VIDEO_PATH = /^\/video\/(BV[0-9a-z]{10}|av[1-9]\d*)\/?$/i;

    const API_URL = "https://api.bilibili.com/x/web-interface/view";

    const SEASON_API_URL = "https://api.bilibili.com/pgc/view/web/season";

    const USER_API_URL = "https://api.bilibili.com/x/web-interface/card";

    const PROFILE_BACKGROUND = "https://i2.hdslb.com/bfs/space/768cc4fd97618cf589d23c2711a1d1a729f42235.png@732w_170h_1c.avif";

    const PROFILE_LEVEL_ICONS = [
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAHvSURBVHgB7ZcxisJAFIZfJKCghaCghWBAwdIFL7DeYG+wR3BvsrtH2JOIpYWFhYWdFoKNoGChoLjzB2cYkzExMRiF9zWTTOYl/z+TyXshYhiGYRiGYV4Wi1JgMBj0TqfTF8VExP52u90fHNuUAkLAh2gciollWT3RXBro9/vv4sInPQZHHti2Tfl8PjRgv9/Tbrfz9SsDQvy3aN7owXQ6HcrlcjeNHY1GtN1uL/oy2nGRHgyE3yoeYLV8faZBclbW6zWNx2MKotVqUbVadZcXM3Q4HMgrst1uu/3L5ZIWi8XVe2GMHg8tJtGhBuSsFIvhiyLHIKZQKLimdSqVirofrgeJHw6HvgmA+SAdGXoSvLMvMW1cnacxEBc2kDZsIG0SNVAqlXx9QZ/OJLjbgP7pq9VqVK/X1Xmj0aByuazON5sNJc3d1ehkMnGTjUxWjuO4ppAQYUgyn8/dTBxZYNRM7AWlghcIhCC0SDQoN3QTzWbzYjzGzmYzCgKxKGH0Yg3i9RWMZQB1jonVaqXKBpOJKOIl2C9R90xim1ia0FN/mPhr5UMUbJOQ6XRK2Wz2atDxePQVbTIWJlDA4Qck7J2HeFSwtxSNuLfpmcZXKM5m0x+EmY8yPsbzlBNlAD/K53/Np0do/SOGYRiGYRjm9fkHEr7c7mjCo1wAAAAASUVORK5CYII=",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAHkSURBVHgB7ZdBasJAFIb/iKALF4KCLgSzU3BhwQvUE7Q36BHsTdoepScQD+DChQt3Cgq6c6GgoNj5ByaNGpMY00bhfSATZ+bNvP/N6HsBBEEQBEEQhIfFQgL0er3O4XB4R0SU7Ve73f7kcxoJoBx4VY2NiFiW9aKaYwHdbvdZDbzhf7ARE44A5fyHap6QANlsFo1GA+n074WYTqeYzWaBtinXcx4JkclkkMvltBDzKRaLoWzPfgOMQqvV0ossl0sMBgPfBWq1GsrlMjabDfr9Pna73dE412k2m7p/Pp97RnW/3yMqKXgI4KYknw8+FDOHNoziKaVSyRnzGier1UoHajwe41pSuBN42tvtFtdyNwKiIgKSRgQkTawCCoXCWd+lv864uFmAO3FVKhVUq1XnO5OcO6Ou12vEzc0ChsOhzsIG27Z18qIQZmjDZDLR9U3cBJbTjOIpjDodYkvnmUVZLpgMXq/Xj+Zzrl+WpR0FG3vCq8e9maX9irpAAe4oulksFnpx4iUirPOEJ3a6D0sa0+cnIPIVcpe+xIhwX6cwzt/K2QnQgdFopEvcS7B6ZO3iZUsRjCjrGlafYeBpXiKoPvK8QmE39oIiGPm/tjE4AviirN7KOngAlK/fEARBEARBEB6fH3A0xxdq+IZAAAAAAElFTkSuQmCC",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJkSURBVHgB7ZbPTxNBFMe/09IfRqmgWEMCUiPioU00cJID6sEEwkE84UlvesSbf4QmylVv3DihB6KJJz1wE2MCF0s0RBJjFZCicbeGjvNWdtl2t7ul3VA2eZ+k2dmZzr75znsz7wEMwzAMwzBMaBFoAY8+PJ2SAvfRIGUppx9cvPeE2m1oAVKICfXIoEEiQtxQj0oBD98/uyqj4g4OhHLGdH5/qg/JaNx3hrZTwkpx1dHfZms9FlJewoHwf/G9R7sx0Xe97lkzK3Mo/Fmv6ItYLSk7cMhJRJyecpyBhHLn7f6bOB5vx5ffXzH7aR5ejPaMINc5gK3StrFDunK1nVTsGG6dGzf6lzbzePdjyRoraOvGzyuEUrF2eOEQQB+jxRPkYj/O7P6H5qSTJw3RdkicsYgYcCq5UTFGombyc57fv3thEql4bRERhJzQC2hJHrAz1JVVhzNRczweTXjOb6kAOmPXui+jGTiEgoJupLxLprVDV241gQqgsqD6Gk0fOVHXXG1Hx6u1N9gvTYeQVt5LXENdOQyfHrTex3pHlKiM9V78u42gaVrA89XXRhY2GU4PIquSFwnJdgxY/cubH7HwbRFB4xtCoz1XHH26cvdCYdGI22LpF2Y/z2Py7LiVwcdUeWGHFv9y7S28SKrr0s2Wm819Cch1nnftX/6ZtypDNxEmtOtk2A+qwWrZMqFyuvqMNRxC1ZWhKcIeTn6Lp4PbLA4PbKmF0G3gVQXqZd2xE4QpIqdinw4sVZ9efNc2fG352XQNIT/DXpCIekImCFvEngAppiHkFMKAFC/AMAzDMAzDhJ9/7ZvlN5zdBFMAAAAASUVORK5CYII=",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAI+SURBVHgB7ZY9aBNhGMf/d4lpo029WhAKgm3FIeLgx+Ykji6Kjg4ujkId3HR31A7ddHRUcHHs6CKYsYJgFYSIYNOSNknT5N6+/6OX3F2u75VcaHrw/CC5r/fj+T/v8z7vAwiCIAiCIAiZxcIYeFmpLbkunmFIFNzlVzdn3/A+jzGgFO5rz81jSCxl39OXsIAXX2u3YeMxjgPVN7589hQmc8mB0OoqrG3tDbzvr4CF1/r/Go6Rhak8Hl06c+T2K2t1VJvd0Dvbv1EWHJxw4lYqH9foabkEp2Bjvd7Bux/bMPHg4mncmC2g1nY9D3Gpg3CcJ5en0NTvKxttfPm32/tGb1YbXRQNIeRM2DARK4CTkoVS8h5fPGgzo/vMFXNY3+6EvlMcjXA8g3OhbxS78r1uHP/51emePXGY5WWAzAsYyzkQ5Nb5CWMaTUqxYxXANHr3QhFpkBBKA9Mo06opTK445pN6pALKerJoGmVqPQym0c9/mjCxWJo2CkgdQs1O/+DihrwzN9l75iFHUT6buy5GTWoB73/uhAyjgOvnCt6Vh5jPt/9trP5tYdQkhhC9GIVLv1pteddNXUK81eUGywX/2H84H+5D4z/+bgyMw9BIykKp02jQi0Eq2ii/MowT4UOh/MXB/XHY+Edl6BCKesYXEQwnk/EkWvgNw8AK0JAPvxqYMVSBLb1xo9nG70sRXnWqhbD6NMEVTJorac7YEEqa2ARFmLw+yrlIT4DlYlnZWEIGsBQ+QRAEQRAEQcg++9vy1Rne+DtcAAAAAElFTkSuQmCC",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAIxSURBVHgB7ZcxSxxREMf/726TXCCaRDghgUgIVjGQQAKBVClNFTuttLPVzg+hoH4FOzutFBTtBEELwSsUsdBCUFDUQkVxnNl3e97evruD2z3Phfk1u/t23u7835udmQUURVEURVGU1GLQAmh5YoRAo2gQurufzvaOTcm5hxZARH18+IwGMdnMfz6EBdwujf/1iIbwBJBh56l4ke8GXuSA0wPg+iJqnGsHOrrYwWvgZC9yuyQgC0ySMT/wFATOv/8E873Pnl8eg9ZnIqb+/bZOO03us105mUdLvEMr8V65x2V3ath4rgeZ34PA67fA2SFocxa1MF97gY/fgKtzu0J3N2EDDgHza4BD4AZ0tA0cbCJJMpERL2edF3iL6yLxKcic4laHEHESx2154E0eSZNBykm9gJbUASfysX75Ex33Xtac9nwESPJwCaiDhlAspHhxWjXVaoDQ2W0zYxUSFWC4LSCuHaExV2oNkJqxu1oqzM5ndgzXFBA/hKRHCej6GYpj0/PP9joBrl4nJrEF0NYcO3b+OCACPvRYIXws2R0VgP01JE3dEPJbhUp460mckRDgVaWNWW4X+rni2grur3wZvvOFBTSD+t+AtAIuxKmgM3SICPCFNmHlAxoPocrMURRRHk7Ndt53IzLCDlBhkZuz9uqzuLNERbaxc4si/O6UP1jpPmNCOyu2SazyTncIxXmxZJokV13+whx/YgElAUSYNgYjSAHs6zwURVEURVGU9PMAtweqIZWRDoQAAAAASUVORK5CYII=",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJkSURBVHgB7Zc9aBRBFMf/s/cR7y53iNdFhaskiHBpFNKpJ1aBBIKlnF38ACNWQiw9sVKDqGhltBOEBNIarGJhYyOeNhYxNhLFO5PLJdmdzNtkl/3e5DbksjC/4nZudmZ2/vvevPcWkEgkEolEIpHEFoYu8Hfs1DiHdgsdwjmfLL78+pjaSXQBztQR8VNChzCmDIuLXcDvq/1nFShV7AccJaOZKp8HyxbCp7SaWP/83tVvCkhw5ZG4DGAfSZ44jd5rT3Y8vnFvFOrPuq1PsbQP44DDsnlXn+sMsEwehbvvoBSPYuP7JzQfXkEQuWoN6cERaEuLaNRGwVeatvtKsQ/521PCBRpoz8+gPfcanUDraku/EC5A+CNtXr8pTByGMYbmJI7166KtkDgSAfQhcbzuuw69gH8TF7FbFMSc2AvoSh7wgmUKODR03fc++f/ax2lX/8ERICJMZuhG4Bg6J84zJl0oCupCHatzb4T79PqOSZcveMZ/gz0VkC5XXCZOitDqB5UHrbcPEESqdiZQQGQXok0Y9FQu2/w4V72P1EDF/O+ViKIS2QL/n98UmfbVdrKCHklUcdgosaUHh81xFEFWZ59irwkVkBWlggsyvdjMVnpf1MsNq4icYw5tfnlqwrWMHnku3UEQFF4RRUCPKAW8aM9PQ13ZKg28RBjQW2/NPvNcg0oPv/V3SsdnwHmwDBFWPw/aPEEFXlRcFqCNkLmdb9L2YOE6zmhjzCUR5Pt+mdOKuvAt9FlhzzS/if+MnfwhLiXEAvbhyIsv56hlWoArfJJpbBwxgHNtBhKJRCKRSCSS+LMJNnTY6MkklTEAAAAASUVORK5CYII=",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAI+SURBVHgB7ZcxbNNAFIb/M0lKsSNgadaSmVZstExIBQmkimaFDgixIhqYEDMgJpoCY1GnlhkhYAkrYu8e5mRBiDptCM31Xlq7cc7xpXGU1NL7Flt353vvv3v33hlgGIZhGIZhEovAGPizeHtFShQxIBJYu/jlW4neUxgDyoGCWrppDIiAXFKPoIDfi7euW8K6jxEgIadJBWFdykPYtvmbWhWtWk1r9wUIiFUp5RWMEHI++/Z93+N3Hj/C/q9KcA7/TeICRkw/Kx8Y7+jjrbBJs+sbOP/5K+xXr2Fisvi0PTb7YSPUIWsq157PWXuHzJ0CBkW6LlrVqtauHWJhO7ByucPOmVmYSF2e8R09k8/j//Z2oD+9cONoPtXftf2dtFSM/334ACfFQsJJvICx1IEwKHQn7i737KcQa34va+2nSICNs/eWI8e4SkT3GeMQGhaUJps/f2jt6blrkfViqAJSV+e1LabU2g/S3cFuaVWfc302UkDsECLDHhNLhcBBpCKXnps/HlutYdjEFlB/+SJQIekgUvEiIRn19KAMsvdxE8PGGEKTxSdaG8VrY2vzsLyrzOA+f9a+dngV/Jxa+U7I+XrpDaKgNBpmSzgOYgnILNwMbW+Wy/7NMEyER0Ot+t6WeeUpznvZimLgEOq+GXoiOsPJ6HzdRVy0HSBHdtV2i6lcz48odLqzjfctiaAz0KtydrJfqRhtmWyGhtA/g+EoyPHGCQ5rHFuEL4B+lIWUK0gAEuITGIZhGIZhmORzAFVa0dNZxTNHAAAAAElFTkSuQmCC",
    ];

    const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
    // B 站原生播放/弹幕 SVG，取自公开播放页 .video-info-detail-list（2026-10-21）。
    // 来源：https://www.bilibili.com/video/BV11sHx6qEWg/

    const STAT_ICON_VIEWBOX = "0 0 20 20";

    const STAT_ICON_FRAME = "M10 4.040041666666666C7.897383333333334 4.040041666666666 6.061606666666667 4.147 4.765636666666667 4.252088333333334C3.806826666666667 4.32984 3.061106666666667 5.0637316666666665 2.9755000000000003 6.015921666666667C2.8803183333333333 7.074671666666667 2.791666666666667 8.471183333333332 2.791666666666667 9.998333333333333C2.791666666666667 11.525566666666668 2.8803183333333333 12.922083333333333 2.9755000000000003 13.9808C3.061106666666667 14.932983333333334 3.806826666666667 15.666916666666667 4.765636666666667 15.744683333333336C6.061611666666668 15.849716666666666 7.897383333333334 15.956666666666667 10 15.956666666666667C12.10285 15.956666666666667 13.93871666666667 15.849716666666666 15.234766666666667 15.74461666666667C16.193416666666668 15.66685 16.939000000000004 14.933216666666667 17.024583333333336 13.981216666666668C17.11975 12.922916666666667 17.208333333333332 11.526666666666666 17.208333333333332 9.998333333333333C17.208333333333332 8.470083333333333 17.11975 7.073818333333334 17.024583333333336 6.015513333333334C16.939000000000004 5.063538333333333 16.193416666666668 4.329865000000001 15.234766666666667 4.252118333333334C13.93871666666667 4.147016666666667 12.10285 4.040041666666666 10 4.040041666666666zM4.684808333333334 3.255365C6.001155 3.14862 7.864583333333334 3.0400416666666668 10 3.0400416666666668C12.13565 3.0400416666666668 13.999199999999998 3.148636666666667 15.315566666666667 3.2553900000000002C16.753416666666666 3.3720016666666672 17.890833333333333 4.483195 18.020583333333335 5.925965000000001C18.11766666666667 7.005906666666667 18.208333333333336 8.433 18.208333333333336 9.998333333333333C18.208333333333336 11.56375 18.11766666666667 12.990833333333335 18.020583333333335 14.0708C17.890833333333333 15.513533333333331 16.753416666666666 16.624733333333335 15.315566666666667 16.74138333333333C13.999199999999998 16.848116666666666 12.13565 16.95666666666667 10 16.95666666666667C7.864583333333334 16.95666666666667 6.001155 16.848116666666666 4.684808333333334 16.7414C3.2467266666666665 16.624750000000002 2.1092383333333338 15.513266666666667 1.9795200000000002 14.070383333333334C1.8823900000000002 12.990000000000002 1.7916666666666667 11.562683333333334 1.7916666666666667 9.998333333333333C1.7916666666666667 8.434066666666666 1.8823900000000002 7.00672 1.9795200000000002 5.926381666666667C2.1092383333333338 4.483463333333334 3.2467266666666665 3.371976666666667 4.684808333333334 3.255365z";

    const STAT_ICONS = {
        view: ["M12.23275 9.1962C12.851516666666667 9.553483333333332 12.851516666666667 10.44665 12.232683333333332 10.803866666666666L9.57975 12.335600000000001C8.960983333333335 12.692816666666667 8.1875 12.246250000000002 8.187503333333334 11.531733333333333L8.187503333333334 8.4684C8.187503333333334 7.753871666666667 8.960983333333335 7.307296666666667 9.57975 7.66456L12.23275 9.1962z"],
        danmaku: ["M13.291666666666666 8.833333333333334L8.166666666666668 8.833333333333334C7.890526666666666 8.833333333333334 7.666666666666666 8.609449999999999 7.666666666666666 8.333333333333334C7.666666666666666 8.057193333333334 7.890526666666666 7.833333333333334 8.166666666666668 7.833333333333334L13.291666666666666 7.833333333333334C13.567783333333335 7.833333333333334 13.791666666666668 8.057193333333334 13.791666666666668 8.333333333333334C13.791666666666668 8.609449999999999 13.567783333333335 8.833333333333334 13.291666666666666 8.833333333333334z","M14.541666666666666 12.166666666666666L9.416666666666668 12.166666666666666C9.140550000000001 12.166666666666666 8.916666666666666 11.942783333333333 8.916666666666666 11.666666666666668C8.916666666666666 11.390550000000001 9.140550000000001 11.166666666666668 9.416666666666668 11.166666666666668L14.541666666666666 11.166666666666668C14.817783333333335 11.166666666666668 15.041666666666668 11.390550000000001 15.041666666666668 11.666666666666668C15.041666666666668 11.942783333333333 14.817783333333335 12.166666666666666 14.541666666666666 12.166666666666666z","M6.5 8.333333333333334C6.5 8.609449999999999 6.27614 8.833333333333334 6 8.833333333333334L5.458333333333333 8.833333333333334C5.182193333333334 8.833333333333334 4.958333333333334 8.609449999999999 4.958333333333334 8.333333333333334C4.958333333333334 8.057193333333334 5.182193333333334 7.833333333333334 5.458333333333333 7.833333333333334L6 7.833333333333334C6.27614 7.833333333333334 6.5 8.057193333333334 6.5 8.333333333333334z","M7.750000000000001 11.666666666666668C7.750000000000001 11.942783333333333 7.526140000000001 12.166666666666666 7.25 12.166666666666666L6.708333333333334 12.166666666666666C6.432193333333334 12.166666666666666 6.208333333333334 11.942783333333333 6.208333333333334 11.666666666666668C6.208333333333334 11.390550000000001 6.432193333333334 11.166666666666668 6.708333333333334 11.166666666666668L7.25 11.166666666666668C7.526140000000001 11.166666666666668 7.750000000000001 11.390550000000001 7.750000000000001 11.666666666666668z"],
    };

    const PUBLISH_TIME_FORMAT = new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    });

    const REQUEST_TIMEOUT = 8000;

    // 与评论悬停预览脚本使用同一固定版本的官方 nano 核心。
    // nano 4.9.28-rc.9716.0-881a2459，来源：B 站搜索页（2026-10-21）。
    const NANO_CORE_URL = "https://s1.hdslb.com/bfs/static/player/main/core.616268d3.js";
    const PAGE_WINDOW = typeof unsafeWindow === "undefined" ? window : unsafeWindow;
    const PLAYER_DELAY = 300;
    const PLAYER_LOAD_TIMEOUT = 15000;
    const PLAYER_CACHE_LIMIT = 2;
    const PLAYER_CACHE_TTL = 2 * 60 * 1000;
    const PLAYER_SLOT = "bili-link-cards-inline-media";
    const PLAYER_CLASS = "bilibili-link-cards-inline-media";

    const CARD_CSS = `
        :host {
            all: initial;
            display: block;
            position: relative;
            box-sizing: border-box;
            width: 100%;
            min-width: 0;
            max-width: 100%;
            margin: 4px 0;
            container-type: inline-size;
            font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
            white-space: normal;
        }
        :host([hidden]) { display: none !important; }
        .card {
            box-sizing: border-box;
            display: grid;
            grid-template-columns: clamp(96px, 26%, 176px) minmax(0, 1fr);
            align-items: stretch;
            width: 100%;
            overflow: hidden;
            border: 1px solid rgba(128, 128, 128, .22);
            border-radius: 8px;
            background: #fff;
            color: #18191c;
            box-shadow: 0 2px 10px rgba(0, 0, 0, .06);
            font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
            overflow-wrap: anywhere;
        }
        .cover {
            position: relative;
            display: grid;
            place-items: center;
            min-width: 0;
            min-height: 88px;
            overflow: hidden;
            background: #f1f2f3;
            color: #777;
            font-size: 12px;
        }
        .cover img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: cover; }
        .resource-badge { position: absolute; top: 5px; left: 5px; z-index: 3; padding: 1px 5px; border-radius: 4px; background: rgba(24, 25, 28, .72); color: #fff; font-size: 11px; }
        .resource-badge[data-live] { background: #fb7299; }
        .cover::after {
            content: "";
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 32px;
            background: linear-gradient(transparent, rgba(0, 0, 0, .5) 99.32%);
        }
        .duration {
            position: absolute;
            right: 6px;
            bottom: 5px;
            z-index: 1;
            color: #fff;
            font-size: 12px;
            font-weight: 400;
            line-height: 18px;
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
        }
        .info { display: flex; flex-direction: column; justify-content: center; min-width: 0; padding: 8px 30px 8px 12px; }
        .summary { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; margin-top: 4px; color: #61666d; font-size: 12px; line-height: 16px; white-space: pre-line; }
        .title {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            overflow: hidden;
            font-weight: 600;
            line-height: 20px;
        }
        .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 8px; min-width: 0; margin-top: 6px; color: #61666d; font-size: 11px; line-height: 18px; }
        .metric { display: inline-flex; flex: none; align-items: center; gap: 4px; white-space: nowrap; }
        .metric svg { flex: none; width: 16px; height: 16px; }
        .meta time { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .owner { flex: 0 1 auto; min-width: 2em; max-width: 100%; overflow: hidden; color: #61666d; text-overflow: ellipsis; white-space: nowrap; }
        .status { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px 30px 8px 10px; color: #61666d; background: #f6f7f8; border: 1px solid rgba(128,128,128,.2); border-radius: 8px; font-size: 12px; }
        .status button { appearance: none; padding: 3px 9px; border: 1px solid #00aeec; border-radius: 4px; background: transparent; color: #00aeec; font: inherit; cursor: pointer; }
        :host([data-dark]) .card { background: #202124; color: #f1f2f3; }
        :host([data-dark]) .cover { background: #303236; color: #aaa; }
        :host([data-dark]) .status { background: #202124; }
        :host([data-dark]) .meta, :host([data-dark]) .owner, :host([data-dark]) .status, :host([data-dark]) .summary { color: #b0b3b8; }
        /* B 站动态页用户卡原生样式与图标（2026-10-21）。
           来源：index.63fa13e0.css / index.c648f6cd.js，s1.hdslb.com/bfs/static/2233-monorepo/dyn-home/static/ */
        .bili-user-profile-view { -webkit-font-smoothing:antialiased;width:100%;font-weight:400;font-family:PingFang SC,HarmonyOS_Regular,Helvetica Neue,Microsoft YaHei,sans-serif!important }
        .bili-user-profile-view { font-family:-apple-system,BlinkMacSystemFont,Helvetica Neue,Helvetica,Arial,PingFang SC,Hiragino Sans GB,Microsoft YaHei,sans-serif!important }
        .bili-user-profile-view__background { background-position:50%;background-repeat:no-repeat;background-size:cover;border-radius:8px 8px 0 0;width:366px;height:85px;position:absolute;top:0;left:0;overflow:hidden }
        .bili-user-profile-view__avatar { border-radius:50%;width:48px;height:48px;position:absolute;top:95px;left:10px }
        .bili-user-profile-view__avatar__face { border-radius:50%;width:100%;height:100% }
        .bili-user-profile-view__avatar__icon { background-color:var(--text_white);background-position:50%;background-repeat:no-repeat;background-size:cover;border-radius:50%;width:14px;height:14px;position:absolute;top:34px;right:0 }
        .bili-user-profile-view__info { box-sizing:border-box;padding:97px 20px 16px 70px }
        .bili-user-profile-view__info__header { align-items:center;height:21px;padding-bottom:10px;display:flex }
        .bili-user-profile-view__info__uname { color:var(--text1);cursor:pointer;font-size:14px;font-weight:700 }
        .bili-user-profile-view__info__uname.render-style { -webkit-text-fill-color:transparent;-webkit-background-clip:text;background-clip:text;background-image:var(--name-render-bg-light) }
        .bili-user-profile-view__info__gender { background-position:50%;background-repeat:no-repeat;background-size:cover;width:16px;height:16px;margin-left:6px;display:block }
        .bili-user-profile-view__info__level { height:22px }
        .bili-user-profile-view__info__level img { width:21px;margin:0 4px }
        .bili-user-profile-view__info__viplabel { background:var(--brand_pink);box-sizing:border-box;color:var(--text_white);white-space:nowrap;border-radius:2px;max-width:58px;height:16px;margin-left:0;font-size:12px;font-weight:400;line-height:16px;overflow:hidden }
        .bili-user-profile-view__info__viplabel__text { transform-origin:50%;justify-content:center;align-items:center;display:flex;transform:scale(.83) }
        .bili-user-profile-view__info__stats { align-items:center;padding-bottom:10px;font-size:12px;display:flex }
        .bili-user-profile-view__info__stat { color:var(--text3);padding-right:18px }
        .bili-user-profile-view__info__stat span { color:var(--text1);margin-right:3px;display:inline-block }
        .bili-user-profile-view__info__officialverify { color:var(--text3);margin-bottom:10px;font-size:12px;line-height:17px }
        .bili-user-profile-view__info__officialverify i { vertical-align:sub;background-position:50%;background-repeat:no-repeat;background-size:cover;width:14px;height:14px;margin-right:2px;display:inline-block }
        .bili-user-profile-view__info__signature { -webkit-line-clamp:2;color:var(--text3);text-overflow:ellipsis;word-break:break-all;-webkit-box-orient:vertical;line-height:16px;display:-webkit-box;overflow:hidden }
        .bili-user-profile-view__info__footer { align-items:center;margin-top:16px;display:flex }
        .bili-user-profile-view__info__button { cursor:pointer;border-style:solid;border-width:1px;border-radius:3px;justify-content:center;align-items:center;width:100px;height:30px;font-size:14px;transition:all .3s;display:flex }
        .bili-user-profile-view__info__button.chat { border-color:var(--text3);color:var(--text2);background-color:#0000 }
        .bili-user-profile-view__info__button.chat:hover { border-color:var(--brand_blue);color:var(--brand_blue) }
        .bili_dark .bili-user-profile-view__info__uname.render-style { background-image:var(--name-render-bg-dark) }
        .bili-user-profile { background-color:var(--bg1_float);color:var(--text3);border-radius:8px;width:366px;font-size:12px;position:absolute;box-shadow:0 0 30px 2px #0000001a }
        .bili-user-profile__content { width:100% }
        .bili-user-profile__error,.bili-user-profile__loading { background-color:var(--graph_weak);color:var(--text2);padding:15px 20px;font-size:12px }
        .bili-user-profile-transition-enter-active,.bili-user-profile-transition-leave-active { transition:opacity .2s }
        .bili-user-profile-transition-enter,.bili-user-profile-transition-leave-to { opacity:0 }
        .bili-user-profile {
            --text1: #18191c; --text2: #61666d; --text3: #9499a0; --text_white: #fff;
            --bg1_float: #fff; --brand_blue: #00aeec; --brand_pink: #fb7299;
            --graph_bg_thick: #e3e5e7; --graph_bg_regular: #f1f2f3;
            position: relative;
            width: 100%;
            max-width: 100%;
            overflow: hidden;
        }
        .bili-user-profile a { text-decoration: none; }
        .bili-user-profile-view__background { width: 100%; object-fit: cover; background: #f1f2f3; }
        .bili-user-profile-view__avatar__face { display: block; object-fit: cover; }
        .bili-user-profile-view__avatar-fallback { display: grid; place-items: center; width: 100%; height: 100%; border-radius: 50%; background: #e3e5e7; color: #9499a0; font-size: 18px; }
        .bili-user-profile-view__info__uname { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        .bili-user-profile-view__info__gender, .bili-user-profile-view__info__level, .bili-user-profile-view__info__viplabel { flex-shrink: 0; }
        .bili-user-profile-view__info__signature { white-space: pre-line; }
        .bili-user-profile a:focus-visible { outline: 2px solid #00aeec; outline-offset: 2px; }
        :host([data-dark]) .bili-user-profile {
            --text1: #e1e2e5; --text2: #a2a7ae; --text3: #9499a0; --bg1_float: #202124;
            --graph_bg_thick: #353638; --graph_bg_regular: #303236;
        }
        @media (max-width: 390px) {
            .bili-user-profile-view__info { padding-left: 64px; padding-right: 12px; }
            .bili-user-profile-view__info__stats { flex-wrap: wrap; row-gap: 4px; }
            .bili-user-profile-view__info__stat { padding-right: 10px; font-size: 11px; }
        }
        @media (prefers-reduced-motion: reduce) {
            .bili-user-profile-view__info__button { transition: none; }
        }

        a { color: inherit; text-decoration: none; }
        a:focus-visible { outline: 2px solid #00aeec; outline-offset: -2px; }
        .title:hover { color: #00aeec; }
        .cover { text-decoration: none; }
        .cover img, .cover::after, .duration, .resource-badge { pointer-events: none; }
        .bili-user-profile { box-shadow: 0 2px 10px rgba(0, 0, 0, .06); border: 1px solid rgba(128, 128, 128, .22); box-sizing: border-box; }
        .bili-user-profile-view__info__header { height: auto; min-height: 21px; flex-wrap: wrap; row-gap: 4px; }
        .bili-user-profile-view__info__uname { max-width: 100%; }
        .bili-user-profile-view__info__stats { flex-wrap: wrap; row-gap: 4px; }
        .bili-user-profile-view__info__stat { padding-right: 12px; }
        .bili-user-profile-view__info { padding-left: 68px; padding-right: 12px; }
        /* 常驻卡片移除空间横幅占位，头像、资料和操作始终横向排布。 */
        .bili-user-profile-view { display: flex; align-items: center; gap: 10px; padding: 10px 30px 10px 12px; box-sizing: border-box; }
        .bili-user-profile-view__background { display: none; }
        .bili-user-profile-view__avatar { position: relative; inset: auto; flex: 0 0 48px; }
        .bili-user-profile-view__info { flex: 1; min-width: 0; padding: 0; }
        .bili-user-profile-view__info__header { padding-bottom: 4px; }
        .bili-user-profile-view__info__stats { padding-bottom: 0; }
        .bili-user-profile-view__info__officialverify, .bili-user-profile-view__info__signature { margin: 4px 0 0; -webkit-line-clamp: 1; }
        .bili-user-profile-view__info__officialverify { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        .bili-user-profile-view__info__footer { flex: 0 0 auto; margin: 0 0 0 auto; }
        .bili-user-profile-view__info__button { width: auto; height: 26px; padding: 0 10px; font-size: 12px; }
        @container (max-width: 420px) {
            .card { grid-template-columns: clamp(80px, 28%, 112px) minmax(0, 1fr); }
            .info { padding: 7px 30px 7px 9px; }
            .summary { -webkit-line-clamp: 1; }
            .meta { column-gap: 6px; margin-top: 4px; }
            .meta time { flex: 1 1 80px; }
            .owner { max-width: 40%; }
            .bili-user-profile-view { display: grid; grid-template-columns: 40px minmax(0, 1fr); align-items: start; gap: 4px 8px; padding: 8px 30px 8px 8px; }
            .bili-user-profile-view__avatar { width: 40px; height: 40px; }
            .bili-user-profile-view__avatar__icon { top: 26px; }
            .bili-user-profile-view__info__header { flex-wrap: nowrap; }
            .bili-user-profile-view__info__uname { flex: 1; }
            .bili-user-profile-view__info__footer { grid-column: 2; justify-self: start; margin: 0; }
        }
        .cover { overflow: hidden; }
        ::slotted(.${PLAYER_CLASS}) {
            position: absolute;
            inset: 0;
            z-index: 2;
            width: 100%;
            height: 100%;
            opacity: 0;
            pointer-events: none;
            overflow: hidden;
        }
        ::slotted(.${PLAYER_CLASS}[data-ready]) { transition: opacity 180ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
            ::slotted(.${PLAYER_CLASS}[data-ready]) { transition: none; }
        }
    `;

    function parseVideo(anchor) {
        const href = anchor.getAttribute("href");
        if (!href) return null;
        try {
            const url = new URL(href, location.href);
            if (!["https:", "http:"].includes(url.protocol)) return null;
            if (url.username || url.password || url.port) return null;
            if (url.hostname === "space.bilibili.com") {
                const uid = url.pathname.match(/^\/([1-9]\d*)(?:\/dynamic)?\/?$/)?.[1];
                return uid && Number.isSafeInteger(Number(uid)) ?
                    { kind: "user", id: uid, key: `user:mid=${uid}` } : null;
            }
            if (url.hostname === "live.bilibili.com") {
                const roomId = url.pathname.match(/^\/([1-9]\d*)\/?$/)?.[1];
                return roomId && Number.isSafeInteger(Number(roomId)) ?
                    { kind: "live", id: roomId, key: `live:room_id=${roomId}` } : null;
            }
            if (!VIDEO_HOSTS.has(url.hostname)) return null;
            const season = url.pathname.match(/^\/bangumi\/play\/(ss|ep)([1-9]\d*)\/?$/);
            if (season && Number.isSafeInteger(Number(season[2]))) {
                const param = season[1] === "ss" ? "season_id" : "ep_id";
                return { kind: "bangumi", id: season[2], param, key: `bangumi:${param}=${season[2]}` };
            }
            const article = url.pathname.match(/^\/read\/cv([1-9]\d*)\/?$/);
            if (article && Number.isSafeInteger(Number(article[1]))) {
                return { kind: "article", id: article[1], key: `article:id=${article[1]}` };
            }
            const opus = url.pathname.match(/^\/opus\/([1-9]\d{0,29})\/?$/);
            if (opus) return { kind: "opus", id: opus[1], key: `opus:id=${opus[1]}` };
            const id = url.pathname.match(VIDEO_PATH)?.[1];
            if (!id) return null;
            const isBvid = id.slice(0, 2).toUpperCase() === "BV";
            const value = isBvid ? `BV${id.slice(2)}` : id.slice(2);
            if (!isBvid && !Number.isSafeInteger(Number(value))) return null;
            return { kind: "video", key: `${isBvid ? "bvid" : "aid"}=${value}` };
        } catch {
            return null;
        }
    }

    function formatDuration(value) {
        if (value === null || value <= 0) return "--:--";
        const seconds = Math.floor(value);
        const tail = String(seconds % 60).padStart(2, "0");
        const minutes = String(Math.floor(seconds / 60) % 60).padStart(2, "0");
        return seconds >= 3600 ? `${Math.floor(seconds / 3600)}:${minutes}:${tail}` : `${minutes}:${tail}`;
    }

    function formatCount(value) {
        if (value === null) return "—";
        if (value >= 1e8) return `${Math.round(value / 1e7) / 10}亿`;
        if (value >= 1e4) {
            const count = Math.round(value / 1e3) / 10;
            return count >= 1e4 ? "1亿" : `${count}万`;
        }
        return String(Math.floor(value));
    }

    function formatProfileCount(value) {
        // 与动态页一致：百万以上计数保留一位小数并截断，避免把 116.9 万显示成 117 万。
        if (value !== null && value >= 1e6) {
            const divisor = value >= 1e8 ? 1e8 : 1e4;
            return `${Math.floor(value / divisor * 10) / 10}${value >= 1e8 ? "亿" : "万"}`;
        }
        return formatCount(value);
    }

    function createStat(kind, label, value) {
        const metric = document.createElement("span");
        metric.className = "metric";
        const text = formatCount(value);
        metric.setAttribute("aria-label", `${label} ${text}`);
        const icon = document.createElementNS(SVG_NAMESPACE, "svg");
        icon.setAttribute("viewBox", STAT_ICON_VIEWBOX);
        icon.setAttribute("aria-hidden", "true");
        icon.setAttribute("fill", "currentColor");
        for (const d of [STAT_ICON_FRAME, ...STAT_ICONS[kind]]) {
            const path = document.createElementNS(SVG_NAMESPACE, "path");
            path.setAttribute("d", d);
            icon.append(path);
        }
        metric.append(icon, document.createTextNode(text));
        return metric;
    }

    function createTextStat(label, value) {
        const metric = document.createElement("span");
        metric.className = "metric";
        metric.textContent = `${label} ${formatCount(value)}`;
        return metric;
    }

    function optionalNumber(value) {
        return typeof value === "number" && Number.isFinite(value) && value >= 0 &&
            value <= Number.MAX_SAFE_INTEGER ? value : null;
    }

    function normalizeVideo(payload) {
        const data = payload?.data;
        if (payload?.code !== 0 || typeof data?.title !== "string" ||
            typeof data.owner?.name !== "string") {
            throw new Error("视频信息暂不可用，视频可能已删除或受限");
        }
        return {
            kind: "video", playable: true,
            title: data.title, owner: data.owner.name, pic: imageUrl(data.pic),
            bvid: typeof data.bvid === "string" && /^BV[0-9a-z]{10}$/i.test(data.bvid) ? data.bvid : "",
            aid: Number.isSafeInteger(data.aid) && data.aid > 0 ? data.aid : null,
            cid: Number.isSafeInteger(data.cid) && data.cid > 0 ? data.cid : null,
            duration: optionalNumber(data.duration),
            pubdate: typeof data.pubdate === "number" && data.pubdate > 0 ? optionalNumber(data.pubdate) : null,
            view: optionalNumber(data.stat?.view),
            danmaku: optionalNumber(data.stat?.danmaku),
        };
    }

    function imageUrl(value) {
        try {
            const url = new URL(value);
            if (["http:", "https:"].includes(url.protocol) &&
                /(^|\.)hdslb\.com$/.test(url.hostname) && !url.username && !url.password && !url.port) {
                url.protocol = "https:";
                return url.href;
            }
        } catch {}
        return "";
    }

    function normalizeSeason(payload, resource) {
        const data = payload?.result;
        if (payload?.code !== 0 || typeof data?.title !== "string") throw new Error("番剧信息暂不可用");
        const episodes = Array.isArray(data.episodes) ? data.episodes : [];
        const episode = resource.param === "ep_id" ?
            episodes.find(item => String(item.id || item.ep_id) === resource.id) : episodes[0];
        // 只呈现官方公开的影视资料和会员试看标记；播放权限由原页面判断。
        const trial = !!episode && episode.status !== 2 && data.rights?.is_preview === 1;
        const playable = data.rights?.can_watch === 1 && !data.rights.forbid_pre && !!episode &&
            (episode.status === 2 || trial) &&
            !episode.rights?.area_limit && Number.isSafeInteger(episode.cid) && Number.isSafeInteger(episode.aid);
        const desc = [data.new_ep?.desc, episode?.show_title || episode?.long_title].filter(value => typeof value === "string" && value);
        if (trial) desc.push("会员内容 · 官方试看");
        return {
            kind: "bangumi", playable, badge: data.type === 2 ? "电影" : "番剧", title: data.title,
            owner: "", pic: imageUrl(episode?.cover) || imageUrl(data.cover),
            summary: desc.join(" · ").slice(0, 240) + (playable ? "" : "\n请打开原页面查看播放权限"),
            bvid: typeof episode?.bvid === "string" && /^BV[0-9a-z]{10}$/i.test(episode.bvid) ? episode.bvid : "",
            aid: optionalNumber(episode?.aid), cid: optionalNumber(episode?.cid),
            episodeId: optionalNumber(episode?.id || episode?.ep_id), seasonId: optionalNumber(data.season_id),
            duration: optionalNumber(episode?.duration) === null ? null : episode.duration / 1000,
            pubdate: optionalNumber(episode?.pub_time),
            view: optionalNumber(data.stat?.views), danmaku: optionalNumber(data.stat?.danmakus),
        };
    }

    function inlineState(html, name) {
        // 只解析公开 SSR 数据，不执行远端脚本，也不把远端 HTML 放入页面。
        const prefix = `window.${name}=`;
        for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
            const text = match[1].trim();
            if (!text.startsWith(prefix)) continue;
            const json = text.slice(prefix.length).trimStart();
            if (!json.startsWith("{")) continue;
            let depth = 0;
            let quoted = false;
            let escaped = false;
            for (let i = 0; i < json.length; i++) {
                const char = json[i];
                if (quoted) {
                    if (escaped) escaped = false;
                    else if (char === "\\") escaped = true;
                    else if (char === '"') quoted = false;
                } else if (char === '"') quoted = true;
                else if (char === "{") depth++;
                else if (char === "}" && --depth === 0) return JSON.parse(json.slice(0, i + 1));
            }
        }
        throw new Error("预览信息暂不可用");
    }

    function publicPage(url, signal) {
        // 仅限这两个公开页面主机。GM 的 anonymous 明确禁止自动携带登录 Cookie。
        const target = new URL(url);
        if (target.protocol !== "https:" || !["www.bilibili.com", "live.bilibili.com"].includes(target.hostname)) {
            return Promise.reject(new Error("预览地址不受支持"));
        }
        if (typeof GM_xmlhttpRequest === "undefined") {
            return fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", signal }).then(response => {
                if (!response.ok) throw new Error("预览信息加载失败");
                return response.text();
            });
        }
        return new Promise((resolve, reject) => {
            let request;
            let settled = false;
            const finish = (error, text) => {
                if (settled) return;
                settled = true;
                signal.removeEventListener("abort", abort);
                if (error) reject(error);
                else resolve(text);
            };
            const abort = () => {
                request?.abort();
                finish(new DOMException("Aborted", "AbortError"));
            };
            if (signal.aborted) return abort();
            signal.addEventListener("abort", abort, { once: true });
            request = GM_xmlhttpRequest({
                method: "GET", url, anonymous: true, timeout: REQUEST_TIMEOUT,
                onload(response) {
                    try {
                        const final = new URL(response.finalUrl || url);
                        if (final.protocol !== "https:" || final.hostname !== target.hostname || final.username || final.password || final.port ||
                            response.status !== 200 || typeof response.responseText !== "string" ||
                            response.responseText.length > 4 * 1024 * 1024) throw new Error("预览信息加载失败");
                        finish(null, response.responseText);
                    } catch (error) { finish(error); }
                },
                onerror() { finish(new Error("预览信息加载失败")); },
                ontimeout() { finish(new Error("预览信息请求超时")); },
                onabort() { finish(new DOMException("Aborted", "AbortError")); },
            });
        });
    }

    function normalizeLive(state) {
        const result = state?.roomInfoRes;
        const data = result?.data;
        const room = data?.room_info;
        const init = state?.roomInitRes?.data;
        if (result?.code !== 0 || !Number.isSafeInteger(room?.room_id) || typeof room.title !== "string") {
            throw new Error("直播间信息暂不可用");
        }
        const restricted = room.hidden_status || room.lock_status || init?.is_hidden || init?.is_locked ||
            (init?.encrypted && !init?.pwd_verified);
        const liveStatus = room.live_status;
        const badge = restricted ? "访问受限" : liveStatus === 1 ? "直播中" : liveStatus === 2 ? "轮播中" :
            liveStatus === 0 ? "未开播" : "状态未知";
        return {
            kind: "live", playable: liveStatus === 1 && !restricted, liveStatus, badge,
            roomId: room.room_id, title: room.title || "直播间", owner: data.anchor_info?.base_info?.uname || "主播信息暂不可用",
            pic: imageUrl(room.cover) || (liveStatus === 1 ? imageUrl(room.keyframe) : ""),
            watched: liveStatus === 1 ? optionalNumber(data.watched_show?.num) : null,
            summary: restricted ? "请打开直播间查看" : liveStatus === 1 ? "" : liveStatus === 2 ?
                "当前为轮播" : liveStatus === 0 ? "主播尚未开播" : "直播状态暂不可确认",
            pubdate: null,
        };
    }

    function normalizeArticle(state, kind) {
        const detail = state?.detail;
        if (!detail || !Array.isArray(detail.modules)) throw new Error("图文信息暂不可用");
        const modules = detail.modules;
        const author = modules.find(module => module.module_author)?.module_author;
        if (typeof author?.name !== "string") throw new Error("图文信息暂不可用");
        const restricted = detail.basic?.is_only_fans || modules.some(module => module.module_blocked || module.module_paywall);
        const paragraphs = restricted ? [] : modules.find(module => module.module_content)?.module_content?.paragraphs;
        const text = [];
        let pic = "";
        if (Array.isArray(paragraphs)) {
            for (const paragraph of paragraphs) {
                const nodes = paragraph.text?.nodes;
                if (Array.isArray(nodes)) text.push(nodes.map(node => node.word?.words || node.rich?.text || "").join(""));
                if (!pic && Array.isArray(paragraph.pic?.pics)) {
                    pic = paragraph.pic.pics.map(item => imageUrl(item.url)).find(Boolean) || "";
                }
            }
        }
        const content = text.join("\n").trim();
        const title = modules.find(module => module.module_title)?.module_title?.text;
        const stat = modules.find(module => module.module_stat)?.module_stat;
        return {
            kind, playable: false, badge: kind === "article" || detail.basic?.comment_type === 12 ? "专栏" : "图文动态",
            title: typeof title === "string" && title ? title : content.slice(0, 64) || "图文动态",
            summary: restricted ? "请打开原页面查看内容" : content.slice(0, 240),
            owner: author.name, pic, replies: optionalNumber(stat?.comment?.count),
            pubdate: optionalNumber(Number(author.pub_ts)),
        };
    }

    function normalizeUser(payload, resource) {
        const data = payload?.data;
        const card = data?.card;
        if (payload?.code !== 0 || String(card?.mid) !== resource.id || typeof card.name !== "string") {
            throw new Error("用户信息暂不可用，账号可能不存在或资料受限");
        }
        const color = (value, fallback) => typeof value === "string" && /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value) ? value : fallback;
        const official = card.Official;
        const verify = card.official_verify;
        const type = official?.type ?? verify?.type;
        const officialType = type === 0 || type === 1 ? type : -1;
        const title = official?.title || verify?.desc;
        const vip = card.vip;
        const label = vip?.status === 1 ? vip.label : null;
        return {
            kind: "user", playable: false, uid: resource.id, name: card.name,
            face: profileImageUrl(card.face, 96, 96, "webp"),
            banner: profileImageUrl(data.space?.s_img, 732, 170, "avif") || profileImageUrl(data.space?.l_img, 732, 170, "avif"),
            gender: card.sex === "男" ? "male" : card.sex === "女" ? "female" : "",
            level: Number.isInteger(card.level_info?.current_level) ? card.level_info.current_level : -1,
            nameColor: color(vip?.nickname_color, "var(--text1)"),
            vipLabel: typeof label?.text === "string" ? label.text : "",
            vipBackground: color(label?.bg_color, "#fb7299"), vipColor: color(label?.text_color, "#fff"),
            avatarIcon: imageUrl(vip?.avatar_subscript_url), officialType,
            officialTitle: officialType >= 0 && typeof title === "string" ? title : "",
            sign: typeof card.sign === "string" ? card.sign.slice(0, 500) : "",
            following: optionalNumber(card.attention), followers: optionalNumber(data.follower) ?? optionalNumber(card.fans),
            likes: optionalNumber(data.like_num),
        };
    }

    function profileImageUrl(value, width, height, format) {
        const image = imageUrl(value);
        if (!image) return "";
        // 使用官网用户卡的 CDN 裁剪尺寸，避免为 366px 卡片下载整张空间横幅。
        const url = new URL(image);
        url.pathname = url.pathname.replace(/@[^/]*$/, "") + `@${width}w_${height}h_1c.${format}`;
        return url.href;
    }

    async function requestResource(resource, signal) {
        if (resource.kind === "user") {
            const response = await fetch(`${USER_API_URL}?mid=${resource.id}&photo=true`, {
                credentials: "omit", referrerPolicy: "no-referrer", signal,
            });
            if (!response.ok) throw new Error("用户信息加载失败");
            return normalizeUser(await response.json(), resource);
        }
        if (resource.kind === "live") {
            return normalizeLive(inlineState(await publicPage(`https://live.bilibili.com/${resource.id}`, signal), "__NEPTUNE_IS_MY_WAIFU__"));
        }
        if (resource.kind === "article" || resource.kind === "opus") {
            const path = resource.kind === "article" ? `read/cv${resource.id}` : `opus/${resource.id}`;
            return normalizeArticle(inlineState(await publicPage(`https://www.bilibili.com/${path}`, signal), "__INITIAL_STATE__"), resource.kind);
        }
        const url = resource.kind === "bangumi" ? `${SEASON_API_URL}?${resource.param}=${resource.id}` : `${API_URL}?${resource.key}`;
        const response = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", signal });
        if (!response.ok) throw new Error("预览信息加载失败");
        const payload = await response.json();
        return resource.kind === "bangumi" ? normalizeSeason(payload, resource) : normalizeVideo(payload);
    }

    function profileLink(className, href, text = "") {
        const link = document.createElement("a");
        link.className = className;
        link.href = href;
        link.textContent = text;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        return link;
    }

    function resourceUrl(resource) {
        if (resource.kind === "user") return `https://space.bilibili.com/${resource.id}`;
        if (resource.kind === "live") return `https://live.bilibili.com/${resource.id}`;
        if (resource.kind === "article") return `https://www.bilibili.com/read/cv${resource.id}`;
        if (resource.kind === "opus") return `https://www.bilibili.com/opus/${resource.id}`;
        if (resource.kind === "bangumi") return `https://www.bilibili.com/bangumi/play/${resource.param === "ep_id" ? "ep" : "ss"}${resource.id}`;
        const query = new URLSearchParams(resource.key);
        const id = query.get("bvid") || `av${query.get("aid")}`;
        return `https://www.bilibili.com/video/${id}/`;
    }

    function renderUser(user, floating = false) {
        const base = "bili-user-profile-view";
        const node = (tag, suffix, text) => {
            const element = document.createElement(tag);
            element.className = base + suffix;
            if (text !== undefined) element.textContent = text;
            return element;
        };
        const home = `https://space.bilibili.com/${user.uid}/dynamic`;
        const view = node("div", "");
        const banner = node("img", "__background");
        banner.loading = floating ? "eager" : "lazy";
        banner.alt = "个人空间横幅";
        banner.referrerPolicy = "no-referrer";
        banner.addEventListener("error", () => {
            if (banner.src !== PROFILE_BACKGROUND) banner.src = PROFILE_BACKGROUND;
            else banner.remove();
        });
        banner.src = user.banner || PROFILE_BACKGROUND;
        const avatar = profileLink(base + "__avatar", home);
        avatar.setAttribute("aria-label", `${user.name}的主页`);
        const fallback = () => node("span", "__avatar-fallback", user.name.slice(0, 1));
        if (user.face) {
            const face = node("img", "__avatar__face");
            face.loading = floating ? "eager" : "lazy";
            face.alt = `${user.name}的头像`;
            face.referrerPolicy = "no-referrer";
            face.addEventListener("error", () => face.replaceWith(fallback()), { once: true });
            face.src = user.face;
            avatar.append(face);
        } else avatar.append(fallback());
        if (user.officialType >= 0 || user.avatarIcon) {
            const icon = node("span", "__avatar__icon");
            if (user.officialType >= 0) icon.classList.add(`officialverify--${user.officialType}`);
            else icon.style.backgroundImage = `url("${user.avatarIcon}")`;
            avatar.append(icon);
        }
        const info = node("div", "__info");
        const header = node("div", "__info__header");
        const name = profileLink(base + "__info__uname", home, user.name);
        name.style.color = user.nameColor;
        header.append(name);
        if (user.gender) {
            const gender = node("span", "__info__gender");
            gender.classList.add(user.gender);
            gender.setAttribute("aria-label", user.gender === "male" ? "男" : "女");
            header.append(gender);
        }
        if (PROFILE_LEVEL_ICONS[user.level]) {
            const level = profileLink(base + "__info__level", "https://www.bilibili.com/html/help.html#k_5");
            const image = document.createElement("img");
            image.loading = floating ? "eager" : "lazy";
            image.referrerPolicy = "no-referrer";
            image.alt = `等级 ${user.level}`;
            image.src = PROFILE_LEVEL_ICONS[user.level];
            level.append(image);
            header.append(level);
        }
        if (user.vipLabel) {
            const vip = node("div", "__info__viplabel");
            vip.style.backgroundColor = user.vipBackground;
            vip.style.color = user.vipColor;
            vip.append(node("div", "__info__viplabel__text", user.vipLabel));
            header.append(vip);
        }
        const stats = node("div", "__info__stats");
        for (const [kind, label, value, path] of [
            ["follow", "关注", user.following, "follow"],
            ["fans", "粉丝", user.followers, "fans"],
            ["like", "获赞", user.likes, ""],
        ]) {
            const item = path ? profileLink(base + "__info__stat", `https://space.bilibili.com/${user.uid}/fans/${path}`) :
                node("div", "__info__stat");
            item.classList.add(kind);
            const count = document.createElement("span");
            count.textContent = formatProfileCount(value);
            item.append(count, document.createTextNode(label));
            stats.append(item);
        }
        info.append(header, stats);
        if (user.officialTitle) {
            const official = node("div", "__info__officialverify");
            const icon = document.createElement("i");
            icon.className = `officialverify--${user.officialType}`;
            const text = document.createElement("span");
            text.textContent = `bilibili${user.officialType === 1 ? "机构" : "个人"}认证：${user.officialTitle}`;
            official.append(icon, text);
            info.append(official);
        }
        if (user.sign) info.append(node("div", "__info__signature", user.sign));
        const footer = node("div", "__info__footer");
        // 匿名资料无法判断当前账号的关注关系；头像和用户名保留主页入口。
        const message = profileLink(base + "__info__button chat", `https://message.bilibili.com/#whisper/mid${user.uid}`, "发消息");
        message.setAttribute("aria-label", `打开与${user.name}的消息页面`);
        footer.append(message);
        view.append(banner, avatar, info);
        (floating ? info : view).append(footer);
        return view;
    }

    function renderResource(video, resource) {
        if (video.kind === "user") {
            const card = document.createElement("div");
            card.className = "bili-user-profile";
            card.setAttribute("aria-label", `${video.name}的用户信息`);
            card.append(renderUser(video));
            return card;
        }
        const slot = video.kind === "video" || video.kind === "bangumi" ? PLAYER_SLOT : "";
        const { cover, info } = renderMedia(video, slot, resourceUrl(resource));
        const card = document.createElement("div");
        card.className = "card";
        card.append(cover, info);
        return card;
    }

    function renderMedia(video, slot, href = "") {
        const cover = href ? profileLink("cover", href) : document.createElement("div");
        cover.className = "cover";
        if (href) cover.setAttribute("aria-label", video.title);
        const placeholder = document.createElement("span");
        placeholder.className = "cover-placeholder";
        placeholder.textContent = video.kind === "live" ? "暂无直播封面" : "封面暂不可用";
        cover.append(placeholder);
        if (video.pic) {
            placeholder.hidden = true;
            const image = document.createElement("img");
            image.loading = href ? "lazy" : "eager";
            image.alt = video.kind === "live" ? "直播间封面" : video.kind === "article" || video.kind === "opus" ? "图文封面" : "视频封面";
            image.referrerPolicy = "no-referrer";
            image.addEventListener("error", () => {
                image.remove();
                placeholder.hidden = false;
            }, { once: true });
            image.src = video.pic;
            cover.append(image);
        }
        if (video.kind === "video" || video.kind === "bangumi") {
            const duration = document.createElement("span");
            duration.className = "duration";
            duration.textContent = formatDuration(video.duration);
            duration.setAttribute("aria-label", `视频时长 ${duration.textContent}`);
            cover.append(duration);
        }
        if (video.badge) {
            const badge = document.createElement("span");
            badge.className = "resource-badge";
            badge.textContent = video.badge;
            badge.toggleAttribute("data-live", video.kind === "live" && video.playable);
            cover.append(badge);
        }
        if (slot) {
            const mediaSlot = document.createElement("slot");
            mediaSlot.name = slot;
            cover.append(mediaSlot);
        }
        const info = document.createElement("div");
        info.className = "info";
        const title = href ? profileLink("title", href, video.title) : document.createElement("div");
        title.className = "title";
        title.textContent = video.title;
        const meta = document.createElement("div");
        meta.className = "meta";
        const publishTime = document.createElement("time");
        const date = video.pubdate === null ? null : new Date(video.pubdate * 1000);
        if (date && Number.isFinite(date.getTime())) {
            publishTime.dateTime = date.toISOString();
            publishTime.textContent = PUBLISH_TIME_FORMAT.format(date).replaceAll("/", "-");
        } else {
            publishTime.textContent = "发布时间未知";
        }
        publishTime.setAttribute("aria-label", `发布时间 ${publishTime.textContent}（北京时间）`);
        if (video.kind === "video" || video.kind === "bangumi") {
            meta.append(createStat("view", "播放量", video.view), createStat("danmaku", "弹幕量", video.danmaku), publishTime);
        } else if (video.kind === "live") {
            const room = document.createElement("span");
            room.className = "metric";
            room.textContent = `直播间 ${video.roomId}`;
            meta.append(room);
            if (video.watched !== null) meta.append(createTextStat("看过", video.watched));
        } else {
            if (video.replies !== null) meta.append(createTextStat("评论", video.replies));
            meta.append(publishTime);
        }
        const owner = document.createElement("span");
        owner.className = "owner";
        owner.textContent = video.owner;
        owner.setAttribute("aria-label", `上传者 ${video.owner}`);
        if (video.owner) meta.append(owner);
        info.append(title);
        if (video.summary) {
            const summary = document.createElement("div");
            summary.className = "summary";
            summary.textContent = video.summary;
            info.append(summary);
        }
        info.append(meta);
        return { cover, info };
    }

    const SCRIPT_ID = "bilibili-link-cards-marker";
    const MODE_KEY = "bilibili-link-cards:mode";
    const MODES = new Map([["inline", "常驻卡片"], ["hover", "鼠标悬浮卡片"], ["both", "同时存在"]]);
    const SHARED_CARD_CSS = `
        /* B 站动态页原生认证与性别图标，来源见上方动态页样式注释。 */
        .bili-user-profile-view .officialverify--0 { background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAASZSURBVHgBxVptThNBGJ5Wo4FAgjGBSCSuMZHon5Z4AMoN4ATACVpOwHIC6gkoJ6A3KJygNDH+8Icu0YhUCU0wEAxmfZ/d2XZnZ/ZzpvVJhk1nttPn/ZyZdygxA3Bdd44e69Sq1F7w5xxvARzeetS61E5KpZLD/hdAmtoutY5bHF1qm9QsNimEiF+5ZnEwdkHGRDyK3TycSlle4po5Yr5vq3F9zNhtjz9PGbsfMPZ34I89oFB4TFM8ojZFU8yuUquxBDjU1rLESKoARH6THk0mBqQPkPz5nrGL5ohsVkAYCPFs1xdOBibcJiHaSdMkCsDNaUsDIP5jzyduAk+3kgSxSYi9uK/GChBLvk8a/27n13gaYJFFm4TZVI3GCqEUgMgjpx9JA992zGk9DvMNxpb2VSNbJMRhtFMSgAcsFpqRz8NlPm/4AToJTFOgv+74wT8CTL4SDWyVAF/oYQmdH1f8zDJJIMAhhIhTEmAl3FEOf+B+bwlfgdtMmjwAa3/difZWiaMd7hgKwF1HGGSXLTM+jwzzzo0L0Hj0m37SEFF3/b2Xh7AFbOG1O4eyTWz2yg6QR3YpCjnjgXwj+OAJwLUvquecvvjHYVqIkr/psdwAeVmRQysEFqgJw9D+5SHTQpQ8iBSNpX4z1gqBAHXhC9C+DubrsttcnzAtXEixsIo/Ze4+VWM/hkBdUgS+7hrSl+aswY1ggZr0Q0V9H+StlnpMNxXDhWQlrEMAM9pPIg/cGFhL5CRQhQAVoeu2y3IjC3kTm7/fx9EeCwJYQtfdGcuFNPKAqZVctmKlhDOc0HX6JLu2cLp6m8FimO9+kDx+tp3uZtjcVa/CPYOHysmyAOSXO9nexQ+LO8tikLnNlVkR4PCx3DFDCsii/RhAAFGsLKRw9Ls3EJQAyP9qZXtXwQ0uBCZzwktpboR8/OFl8jsI7LTdZx7yACwvwoEFRNtNV5gRpM2TlzwgH/o9AcS8ObPGtAErTlXjx3FIyksekOfsjccCSeTPNcoxs6vRni4EaIsv1fSzy3SMACCPA0oRBIUwESdlOiQjYo+F7vkG04KsKT3y3py1aA8O+E6wDog7uIU600LUArrkgUWp5uv5YTn0YZQ74UJFrQBTh9OdCfIoPcop1FO6JwB3I/HIA4mLxEJY+ybIeyVHSfutoMAV3krIVljMVar3ESyCJsgDOJrK2h+e8oXKHC8aiaxRXOoXTHu6wNlaPp7ukfbt4IOqtIj9sRiFn9YmVxcNoN6qO0Re2MOodqNUxY1s8F4dxef2cWCmptqqg5O0TZAE4MEhFiURD2+6+utDFsBt1Fv1bdWVk/I8QC+2WChQhkDd3jpQBZU+QPj5vrok4/t9WzWQdsVks2hQAyi7IMPoVu8CBIUwddoWgjaKLJd86/QgtSsu+QJBUIrJW0vyFksivtCIIw6f3+HeEIs816yIKiv2JWQpCIIKBGqrECh8zYqGRIA9zVQl7ZoVO+QN4/+KAJdyx4ur6AWGccAa1FquWXjE3dDFxdjBBdly/X/YKIqOLvFMMZBFGOYXibHa4UhnMTFeBrzBt8/4s803kVr4B9ZWrx2gQRFMAAAAAElFTkSuQmCC) }
        .bili-user-profile-view .officialverify--1 { background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAT3SURBVHgBxVq9bxxFFH/3kVzwWY5FAUYK4iK7oEDyhhIh4VSkTEQaqnMKKpCCK2hQLqJKBUhQUeTcx0rKUBn/A/gsUSBxUS6iiJUmTnSX2Mbn5f3mZk+zs7MfNzN3/KTx6t7e7f7e18ybNy6RB4RhuMiXqzwCHu/J66IcEXpy7PHY5bFTKpV69H8BpHnc4rEd2mOXR5NHg2YFhfjz0C/uTl2RKRHXcWsSTqUiX5KWuU+j2Dai82JI3VdD2ntxQt3BkPpDov5JKO7NV0u0dJbHuTIt1ysULFQpOF/JeKPIlctFciRXASbf5MuPFE9IARDcenpM93hEZItiqVYWSjQv1IRiBhzwuMFKPMh6TqYC0p0tXQ6ym/8cCeI+cOWtM1mKtFiJ22m/TVUgjTws3mbyk1o8D/BI892aUMaAVCWMCjB5zOn3dfkvjw+9WT0N1985S19ePGe6tc5KbOrChAIyYbHQjGMe1v7ur1fUeTmkWWBlrkw/fFAXya8AOXFJT2yTAo/50lBlX3T6PMOc0iwRLFSEEho6rMAlVRDLGhn3DVWGsJk1eQDexrs1BMyxpQrGCsjQid18+OzYS8wjObc/WqBPzQmaintPje+/GY5qLwHVAy31W/tHp2KqdAXIr/MACq2aGjaTMx7Ifx19EApI6zf1H+4fuU2VKnmg2588FKM1R8PYC5EH1tS7sP7DZ/+SC3TyIIJSwwaGlX7shUiBm+pd19D5jOdylTyAWskFhlz4BH/KMnyC+MtOyBZI1K8MC1Hnpf0zga2kAmsII3hgLfYitpRt7IP8tytvGO89Grh5ACFkMOxVKBC3vqWlssgDPtYSwzMCKLCqSmwslUse+wMPxZ/BAw0o0FAl+4eTvSiPPNAd+KmhHg0SHlitkq7AcXFXo+jKIw98/OYZCj6spt7vD0O68/fr3DDD9zQsJp5a1NVRxVgEqCq1ytIKBm6LZbIANh+Gctcad7qvrZMcChyogiKklmolbzsykC+66pu4IYSgwLi6m6/AVZnPEaXu53/0M7/zDefGlZzqcxLyAAynoQcPdFTJSr1CPrBSz47OSckDb9cSzxQKPFElq+er5Aq4OssQ2KjYFIuGZ+4lPTBnlddU9Bku7RhsMzXs4k2xxlHAHnCdXZZTrA/ybctKd9QIS0THTpk3yUji31UpymEXGF7kRB5YTbYiscHvRb7eUe9cd1RADyFX8sD6hZouQrtzvKHBh/F6gBCy9QJcrbYIfZBHvWVoOwqjC6kMo5/Uu9hR2eTCct0veRjEYP121OBS1Up4oZn8YS4GcoX2QR7A3tpg/XGfNGZi2TSKHTD8zHP21pT7oWlAGBu2p7fZ+q3og6m1iL5obJe28edgZn3RCJgIfg3mdXGPyV9UBaYV5xppBd737895WeCKIqUvCk6XdWGClUyODVWGfIA1XNeHIsA7Ukr1G6Yjp6wDjhZp+QCgX+qja6dDTBqcsClrUCzuVeQdMbXIoAQ6d5hhfnPs3kWIGmEp03YqeaDIIR9Oa+6S4ZAvUgQnk5N6JFosYfEU4oj5DSbfznrOJMes26Q1AFSg5YGZCm2Z/cNTbg6EsWNWbJRQDqNcx4QQZJftqJCvef9XBIRUOF081w8wvAPe4NEO/UIQD5WDi6lDKrIejv5hwxbbrsS99EXCUY6s0WgFR6uyQfF8OZADsf1EXh/IItIJ/wGIiiU8ye7cIAAAAABJRU5ErkJggg==) }
        .bili-user-profile-view__info__gender.male { background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAsCAYAAAAehFoBAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAALKADAAQAAAABAAAALAAAAAD8buejAAAEbUlEQVRYCe2XXWgcVRTH/3dmsySaFlMMKK2CgqiIBUUEpdCE4kcqIunHqvSt3VYbWixiKz6ooT6JSh9KqOTDR7GbgAlIsVGIPij1weJLREIJid1SNW2t2I91d2eu/zPNjcNkNnd2NVVkBmbvveeee85v/nM/ZoH0ShVIFUgVSBX4NxVQy5V8b0G3lzS2+0CrclCF5g14iqVmW7N05m1QqGRdTPRtVrM2nmUD3nlUv03YAzYA00+QX1corD6UU1eNLa504oz/iM3BGJX7nvd53heVwiXGLbGssq2jOWhoK7m4NWqPtpdN4WiiaDs/rA9qH6+H7U4T7h7YpKbCtmh9+RSOZgq180d1r4Gl4n+YLqeKjKnXKq87cAALvDkPNMPpsdvAec5/DDgK25xBB2FPGWDK65p6rfK6KRwHK9uYe21rC/g8ZVfYOmfinrR3QmfOXECH76GL++pdfK0rucovcV+dhIMvHtMYz+WUZ8bWgpV+bs4Lfo5nB65b4Z3D+rniHKb8Kj7j5vQyQZ/mIbCe9adk3/V9HBsHprkPbxegpWCl33WDA0WqPFXswIkV7i3o7GmFIwQKQCQBV/gVFt/yPse7jfdawq/ifTsfZIiwr7C8l3a5ZmTORk8zPzQlnASLLjFwUeMDqrhNMhP0R0K90dKKjw5vVAvbkkyV4nk8zpf8FkEfXIBVmG1qQmdf9+Kj1/VRlTNbLvpbF10iYE6DHiprYL9k4E1Dz6oL19L89dvbqST3sUJBHx/XOES/vdLL0+nE+91qRurRK9uKYvV3XKb9xoyH09H+aNt60vUUdCslnObjt9N5ylF4uD+nfosGimvnC3qQb2JH0KfQNZRTn8b57RrR98hUGtiqvo7rD9usClc0nueAdhmkFV5KCiv+a9qxhwv0CcKs4cO+SlMscP8W9YP4J7msuwQhuyQQ5+2pWgrVSsQpUuJ8eE/6Cd3RM6pvq+Wb1G4FZqD7JRjBJ5IGDftlMhg17XIZj5p6o6UVmAvnZgnOQ+FsI0nmF1tpfuwdjcQIj7ECc+7Jdyx8hRvCA+usl8WfsVrqHLfI3QrM3WE2GKVx36LRCQwHxvQKuq0UV76tnxIMWdLFDgx8HkTQ6Nz3sb5pyWgxnRcr2GDMPIYnTb3R0gqsXAzzXVIcNF8uJ/+PZoB44OyTOqfDuQ0evjL2Rksr8MAWNclkBUnAnWI//9p0JE22Y1jnuZ2tD/wdHAl/wSWNEfWzAsuAbBb7KdEck2f412YsP6I3RgNF2zzOt/G99Imde3hxVRbvRH0aaVO8ZNeugl7Hz8dxQrfIFOF38IcEeXcgp74LR3hxRD9Q8fEaYbeKnT5XHRfr+jerk2G/RuuJgSXBCyP6Ic/HKKFXm4QEOku4aT4EnwF3sn5LuI+fjN08er8xtr9b1gUsyXZ/otsqV6ggsCdQO45AoUzwQdWMg4PPqJ/jXBq11Q1sEslXHE+DJ6nqI7QF3whU+xf4ONGicPxwTs0Z37RMFUgVSBVIFfj/KPAnnoB30RYEztcAAAAASUVORK5CYII=) }
        .bili-user-profile-view__info__gender.female { background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAsCAYAAAAehFoBAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAALKADAAQAAAABAAAALAAAAAD8buejAAAERElEQVRYCe2XXWgcVRTH77l3pGl1k1ZKBR9E8RO1BGqxiAgqUgVRUWrVfkDRJEtBiqShFVHYB1GUZAV9ysY8KEqrRR9aFbRotBVEpFhQfFCoVdsqCtp22xTbuXP8n2lmMyQ7d+7upurDDCT33K9zfvnfM+dOlCqeQoFCgUKBQoH/UgE6F8F562iPtXqVYr6LFV9OihYyqz9I8fdK6fdMd7SLKuXJdmLPKTBXWEf12hAr9SQAF2UBEanf8FMxw+XRrDVZ43MGzFvGS9aG2wB6twSDqjB5HxF9wcR/EqvFGLgJU8sSGATfYbrVhlbUnhNgUdbWazsbsESfmICfoBfK3yRwSYt0WWpDqjLzHTIGpd83pYF7qUJRssbVatek71x04tVN07CqZlYsXNkMVvzJuCn136k0VaUv+6L62NNi+zwdKxynQmgP4vgvRB7sCVYsup1Wr7Y+wcPNtR1QehUgJk2XuoKeK/+at69jhW0U3hPDIlKg9KAvrICZebxJYPGSLghPq415sDLfMbBitTIOROo7Gunf5xM0WRMrSvRO3Ge6Lxl3tR0Ds6IrJQCU+tIVKHuOPz67n6/nykSQve7sTC4wv/zBPOSZI9d5vrgC+NG8YM3mmehwvJ9x2pMHljRbkx5zAvPQ60vswUNHwqHatyhHl6Q3Jjbq7TGx8RflBkv2pFsUswWNvu461bAzDCewMqe6UP+7Id+1qJ2fNoOG+vtj38w3Z8RwDuO6XioLcMGcVM+vyT0lJzBq5s+K9TqoaAF2WTNoBPpIAuJNv/TMltHbxG7lwW3x4NT6CfiCG/fjBJatQbX/Lfz9a7OgcQl8iHQ4EIcJ1bDkvDvk9CxS7WH0euMR4m3TM9lWLrBsdUHHV6rWg1MhltmfDo37vO28dbwXx1KL96EkmgsGtk/5cDZewOLBBW20/gonEOcfUmetrf+wGzfg1c0iS8XBDbfengk/h13C6UwGbNb5fktgfWtPODj2EDL2TdxuBjn3ozG0JrT8Gj4Krkp7wkdNiD7ShXaj5P2iKOrCd8N1GHsAyl4jawUWvx8JqgM7pe/ztAwsTtPQ6SBa0WZ8Sh7H2DDgetJzs2yi/QHrR6na9/WsOcdAW8Dizw6NPh5F6pWGb6JnzxsZeEb68h9HFNKGiNX9UHo5jv58GYf9u2LaC2O7KfW965sGsjd52gJGfl4cWjuRToM4PQK+NS6Fifeplqtvz1fH/6JWPtRnuGh0WwaeCQsHb0geNnI6A7oRsUPDu0pInJmwmtRgUC2vB3Bmne6Qb9Z2b4X5qbGLwr95T5IGAmtGyi8lHtMvois9kvXttt4Kh6ejjVmwEtxVp9uFa7bPGxglaBeO/jPSui+tbNrpvwHtnRJpsDx7VnoY00svPlbP2+cz762wj7NkzUylwyi6IZnrtD0nwAIl0EabW3BZ9Ac39uztFLTYXyhQKFAoUCjw/1DgHz524LXaAru+AAAAAElFTkSuQmCC) }
        :host .cover[data-player="playing"] { background-color: #000; }
        .cover[data-player="playing"] > img,
        .cover[data-player="playing"] > .cover-placeholder { visibility: hidden; }
        .card-settings {
            position: absolute;
            top: 4px;
            right: 4px;
            z-index: 5;
            color-scheme: light;
            color: CanvasText;
            font: 13px/1.4 system-ui, sans-serif;
        }
        :host([data-dark]) .card-settings { color-scheme: dark; }
        .card-settings button {
            box-sizing: border-box;
            background: Canvas;
            color: inherit;
            font: inherit;
            cursor: pointer;
        }
        .card-settings button:focus-visible { outline: 2px solid #00aeec; outline-offset: 1px; }
        .card-settings .gear {
            display: grid;
            place-items: center;
            width: 22px;
            height: 22px;
            padding: 0;
            border: 1px solid color-mix(in srgb, CanvasText 20%, Canvas);
            border-radius: 50%;
            font-size: 14px;
            line-height: 1;
        }
        .card-settings .options {
            position: absolute;
            top: 100%;
            right: 0;
            display: grid;
            gap: 2px;
            width: max-content;
            padding: 4px;
            border: 1px solid color-mix(in srgb, CanvasText 20%, Canvas);
            border-radius: 8px;
            background: Canvas;
            box-shadow: 0 3px 12px #0003;
        }
        .card-settings .options[data-above] { top: auto; bottom: 100%; }
        .card-settings .options button {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 4px 8px;
            border: 0;
            border-radius: 4px;
            text-align: left;
        }
        .card-settings .options button::before { content: "✓"; visibility: hidden; }
        .card-settings .options button[aria-pressed="true"]::before { visibility: visible; }
        .card-settings .options button:hover, .card-settings .options button[aria-pressed="true"] {
            background: color-mix(in srgb, #00aeec 15%, Canvas);
        }
    `;
    const CARD_ATTRIBUTE = "data-bili-link-cards-inline";
    const GROUP_ATTRIBUTE = "data-bili-link-cards-group";
    const EXPANDED_ATTRIBUTE = "data-bili-link-cards-expanded";
    const OWN_SELECTOR = `[${CARD_ATTRIBUTE}], [${GROUP_ATTRIBUTE}]`;
    const DESCRIPTION_SELECTOR = "#v_desc .basic-desc-info";
    // 视频简介里的 @用户链接可以直接放在正文 .desc-info-text 旁边。
    const DESCRIPTION_LINK_SELECTOR = `${DESCRIPTION_SELECTOR} .desc-info-text a[href], ${DESCRIPTION_SELECTOR} > a.mention-user[href]`;
    const COMPONENTS = ["bili-comments", "bili-comment-thread-renderer", "bili-comment-renderer",
        "bili-comment-replies-renderer", "bili-comment-reply-renderer", "bili-rich-text"];
    const COMPONENT_SELECTOR = COMPONENTS.join(",");
    const RENDERERS = new Set(["BILI-COMMENT-RENDERER", "BILI-COMMENT-REPLY-RENDERER"]);
    const NATIVE_USER_SELECTOR = '[data-user-profile-id], [data-type="mention"]';
    const LINK_ATTRIBUTES = ["href", "data-user-profile-id", "data-type"];
    const REQUEST_GAP = 700;
    const CACHE_TTL = 5 * 60 * 1000;
    const LIVE_CACHE_TTL = 15000;
    const ERROR_TTL = 20000;
    const CACHE_LIMIT = 60;
    if (document.getElementById(SCRIPT_ID) || !isSupportedPage()) return;
    let mode = readMode();
    const marker = document.createElement("meta");
    marker.id = SCRIPT_ID;
    (document.head || document.documentElement).append(marker);
    const layoutStyle = document.createElement("style");
    layoutStyle.textContent = `#v_desc .basic-desc-info[${EXPANDED_ATTRIBUTE}] { height: auto !important; max-height: none !important; overflow: visible !important; }`;
    marker.after(layoutStyle);

    const roots = new Map();
    const commentGroups = new Map();
    const descriptionCards = new Map();
    const expandedParents = new Set();
    const records = new Set();
    const recordsByHost = new WeakMap();
    const dirtyComments = new Set();
    const pendingTrees = new Set();
    const probes = new Map();
    const cache = new Map();
    const tasks = new Map();
    const queue = [];
    const players = new Map();
    const playerPool = document.createElement("div");
    playerPool.hidden = true;
    playerPool.setAttribute("aria-hidden", "true");
    document.documentElement.append(playerPool);
    let nanoTask = null;
    let nanoRetryAfter = 0;
    let playerCacheTimer = 0;
    let hoveredRecord = null;
    let activePreview = null;
    let descriptionRoot = null;
    let descriptionObserver = null;
    let descriptionDirty = true;
    let frame = 0;
    let pumpTimer = 0;
    let running = null;
    let lastRequestTime = -Infinity;
    let route = location.href;
    let stopped = false;
    let openSettings = null;
    const themeQuery = matchMedia("(prefers-color-scheme: dark)");
    const visibility = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => {
        for (const entry of entries) {
            const record = recordsByHost.get(entry.target);
            if (!record) continue;
            if (entry.isIntersecting && record.expires <= Date.now()) record.loaded = false;
            record.near = entry.isIntersecting;
            if (record.near && !record.loaded && !record.unsubscribe) subscribe(record);
            else if (!record.near && tasks.get(record.resource.key)?.state === "queued") unsubscribe(record);
        }
    }, { rootMargin: "600px 0px" }) : null;

    function isCurrentPreview(session) {
        if (activePreview !== session) return false;
        const record = session.record;
        if (!inlineEnabled() || document.hidden || hoveredRecord !== record || !records.has(record) ||
            !record.host.isConnected || !record.anchor.isConnected || !session.cover.isConnected ||
            record.cover !== session.cover || record.details !== session.details ||
            location.href !== session.route || !isSupportedPage() ||
            resourceFor(record.anchor)?.key !== record.resource.key) {
            stopPreview(record);
            return false;
        }
        return true;
    }

    function stopPreview(record = null) {
        const session = activePreview;
        if (!session || record && session.record !== record) return;
        activePreview = null;
        stopPlayer(session);
    }

    function cancelPreview() {
        hoveredRecord = null;
        stopPreview();
    }

    function stopPlayer(session) {
        clearTimeout(session.playerTimer);
        clearTimeout(session.playerLoadTimer);
        session.playerTimer = 0;
        session.playerLoadTimer = 0;
        session.observer?.disconnect();
        session.observer = null;
        session.cancelFrame?.();
        session.cancelFrame = null;
        const entry = session.playerEntry;
        session.playerEntry = null;
        if (entry?.owner === session) {
            entry.container.removeAttribute("data-ready");
            entry.container.style.opacity = "0";
            entry.owner = null;
            entry.lastUsed = Date.now();
            entry.needsReset = true;
            pauseEntry(entry);
            playerPool.append(entry.container);
            scheduleCacheCleanup();
        }
        session.cover.removeAttribute("data-player");
    }

    function pauseEntry(entry) {
        try { entry.player.pause(); } catch {}
        try { entry.media?.pause(); } catch {}
    }

    function disposeEntry(entry) {
        if (entry.disposed) return;
        entry.disposed = true;
        if (entry.owner) stopPreview(entry.owner.record);
        pauseEntry(entry);
        entry.media?.removeEventListener("playing", entry.guardPlayback);
        entry.media?.removeEventListener("error", entry.onError);
        if (entry.sdk.EventType?.Player_Error) {
            try { entry.player.off?.(entry.sdk.EventType.Player_Error, entry.onError); } catch {}
        }
        if (entry.sdk.EventType?.Player_Ended) {
            try { entry.player.off?.(entry.sdk.EventType.Player_Ended, entry.onEnded); } catch {}
        }
        try { entry.player.disconnect(); } catch {}
        entry.container.remove();
        if (players.get(entry.key) === entry) players.delete(entry.key);
    }

    function scheduleCacheCleanup() {
        clearTimeout(playerCacheTimer);
        let next = Infinity;
        for (const entry of players.values()) {
            if (entry.owner) continue;
            const remaining = entry.lastUsed + PLAYER_CACHE_TTL - Date.now();
            if (remaining <= 0) disposeEntry(entry);
            else next = Math.min(next, remaining);
        }
        playerCacheTimer = Number.isFinite(next) ? setTimeout(scheduleCacheCleanup, next) : 0;
    }

    function readNano() {
        const sdk = PAGE_WINDOW.nano;
        return typeof sdk?.createPlayer === "function" ? sdk : null;
    }

    async function ensureNano() {
        const existing = readNano();
        if (existing) return existing;
        if (nanoTask) return nanoTask;
        if (Date.now() < nanoRetryAfter) throw new Error("播放器暂不可用");
        nanoTask = new Promise((resolve, reject) => {
            // 复用站点或另一预览脚本正在加载的核心，不覆盖原有事件处理器。
            const found = Array.from(document.scripts).find(script => {
                try {
                    const url = new URL(script.src);
                    return url.hostname === "s1.hdslb.com" &&
                        /^\/bfs\/static\/player\/main\/core(?:\.[a-z0-9]+)?\.js$/.test(url.pathname);
                } catch { return false; }
            });
            const script = found || document.createElement("script");
            const cleanup = () => {
                clearTimeout(timeout);
                script.removeEventListener("load", loaded);
                script.removeEventListener("error", failed);
                if (!found) script.remove();
            };
            const loaded = () => {
                const sdk = readNano();
                cleanup();
                if (sdk) resolve(sdk);
                else reject(new Error("播放器核心不可用"));
            };
            const failed = () => {
                cleanup();
                reject(new Error("播放器核心加载失败"));
            };
            const timeout = setTimeout(failed, PLAYER_LOAD_TIMEOUT);
            script.addEventListener("load", loaded, { once: true });
            script.addEventListener("error", failed, { once: true });
            if (!found) {
                script.src = NANO_CORE_URL;
                script.async = true;
                (document.head || document.documentElement).append(script);
            }
        });
        try {
            return await nanoTask;
        } catch (error) {
            nanoRetryAfter = Date.now() + ERROR_TTL;
            throw error;
        } finally {
            nanoTask = null;
        }
    }

    function ownsPlayer(session, entry) {
        return !entry.disposed && entry.owner === session &&
            session.playerEntry === entry && isCurrentPreview(session);
    }

    function failPlayer(session, entry = session.playerEntry) {
        if (entry && !ownsPlayer(session, entry)) return;
        stopPlayer(session);
        if (entry) disposeEntry(entry);
    }

    function createNanoPlayer(sdk, video, resourceKey, container) {
        const ids = Object.fromEntries(new URLSearchParams(resourceKey));
        try {
            return sdk.createPlayer({
                bvid: video.bvid || ids.bvid,
                aid: video.aid || (ids.aid ? Number(ids.aid) : undefined),
                cid: video.cid || undefined,
                episodeId: video.episodeId || undefined,
                seasonId: video.seasonId || undefined,
                element: container,
                muted: true,
                autoplay: false,
                controlsList: new PAGE_WINDOW.Set(["noPlaybackClue"]),
                featureList: new PAGE_WINDOW.Set([
                    "noAudioStream", "noVVReport", "noVTReport", "noBufferView", "hasHomepageTimeLabel",
                ]),
                kind: video.kind === "bangumi" ? sdk.GroupKind.Pgc : sdk.GroupKind.Ugc,
                channelKind: sdk.ChannelKind.Homepage,
                quality: 32,
                hideBoxShadow: true,
                enableHEVC: true,
                enableAV1: false,
            });
        } catch (error) {
            container.remove();
            throw error;
        }
    }

    function createPlayerEntry(sdk, video, resource) {
        const key = `${video.kind}:` + (video.cid ? `cid=${video.cid}` : video.bvid ? `bvid=${video.bvid}` : resource.key);
        const cached = players.get(key);
        if (cached && !cached.disposed) return cached;
        if (players.size >= PLAYER_CACHE_LIMIT) {
            const oldest = Array.from(players.values()).filter(entry => !entry.owner)
                .sort((a, b) => a.lastUsed - b.lastUsed)[0];
            if (oldest) disposeEntry(oldest);
        }
        const container = document.createElement("div");
        container.className = PLAYER_CLASS;
        container.slot = PLAYER_SLOT;
        container.inert = true;
        container.tabIndex = -1;
        container.setAttribute("aria-hidden", "true");
        // nano 样式注入 document；保留 light DOM，并通过 slot 放入卡片封面。
        playerPool.append(container);
        const player = createNanoPlayer(sdk, video, resource.key, container);
        const entry = {
            key, container, player, sdk, owner: null, media: null,
            connected: false, disposed: false, needsReset: false,
            lastUsed: Date.now(), task: Promise.resolve(),
        };
        entry.onError = () => {
            if (entry.owner) failPlayer(entry.owner, entry);
            else disposeEntry(entry);
        };
        entry.onEnded = () => {
            if (entry.owner) {
                entry.needsReset = true;
                queuePlayback(entry.owner, entry);
            }
        };
        if (sdk.EventType?.Player_Error) player.on(sdk.EventType.Player_Error, entry.onError);
        if (sdk.EventType?.Player_Ended) player.on(sdk.EventType.Player_Ended, entry.onEnded);
        players.set(key, entry);
        return entry;
    }

    function waitForFrame(session, entry, isOwned, fitMedia) {
        session.cancelFrame?.();
        const media = entry.media;
        let callbackId = 0;
        let rafId = 0;
        let cancelled = false;
        const cancel = () => {
            cancelled = true;
            if (callbackId) media.cancelVideoFrameCallback?.(callbackId);
            if (rafId) cancelAnimationFrame(rafId);
            media.removeEventListener("playing", onPlaying);
        };
        const reveal = () => {
            if (cancelled || !isOwned(session, entry)) return;
            if (media.paused || media.readyState < 2 || !media.videoWidth) return;
            fitMedia?.(entry.container, media);
            cancel();
            clearTimeout(session.playerLoadTimer);
            session.playerLoadTimer = 0;
            entry.container.setAttribute("data-ready", "");
            entry.container.style.opacity = "1";
            session.cover.setAttribute("data-player", "playing");
        };
        const onPlaying = () => {
            // 旧浏览器在 playing 后等待两次绘制。
            rafId = requestAnimationFrame(() => { rafId = requestAnimationFrame(reveal); });
        };
        session.cancelFrame = cancel;
        if (typeof media.requestVideoFrameCallback === "function") {
            const onFrame = () => {
                if (cancelled || !isOwned(session, entry)) return;
                reveal();
                if (!cancelled) callbackId = media.requestVideoFrameCallback(onFrame);
            };
            callbackId = media.requestVideoFrameCallback(onFrame);
        } else {
            media.addEventListener("playing", onPlaying);
            if (!media.paused) onPlaying();
        }
    }

    function queuePlayback(session, entry) {
        // 同一实例的异步操作串行，避免快速 A→B→A 时旧任务影响新悬停。
        entry.task = entry.task.then(async () => {
            if (!ownsPlayer(session, entry)) return;
            if (!entry.connected) {
                if (!await entry.player.connect()) throw new Error("播放器连接失败");
                entry.connected = true;
                if (entry.disposed) {
                    pauseEntry(entry);
                    try { entry.player.disconnect(); } catch {}
                    return;
                }
            }
            if (!ownsPlayer(session, entry)) return;
            if (entry.needsReset) {
                await entry.player.seek(0);
                entry.needsReset = false;
            }
            if (!ownsPlayer(session, entry)) return;
            const media = entry.container.querySelector("video");
            if (!media) throw new Error("播放器未创建视频元素");
            fitPreviewMedia(entry.container, media);
            if (entry.media !== media) {
                entry.media?.removeEventListener("playing", entry.guardPlayback);
                entry.media?.removeEventListener("error", entry.onError);
                entry.media = media;
                entry.guardPlayback = () => {
                    if (!entry.owner || !ownsPlayer(entry.owner, entry)) pauseEntry(entry);
                };
                media.addEventListener("playing", entry.guardPlayback);
                media.addEventListener("error", entry.onError);
            }
            media.muted = true;
            media.playsInline = true;
            media.tabIndex = -1;
            waitForFrame(session, entry, ownsPlayer, fitPreviewMedia);
            await entry.player.play();
            if (!ownsPlayer(session, entry)) pauseEntry(entry);
        }).catch(() => {
            // 失败保留封面；旧任务不能关闭已由另一悬停接管的实例。
            if (entry.owner === session) failPlayer(session, entry);
            else if (!entry.owner) disposeEntry(entry);
        });
    }

    function fitPreviewMedia(container, media) {
        // 评论组件还有外层 Shadow DOM，nano 注入 document 的布局样式无法穿透。
        // 只调整实际视频及其祖先链，并隐藏旁系控件，不依赖 SDK 的内部类名。
        let child = media;
        while (child && child !== container) {
            Object.assign(child.style, {
                position: "absolute", inset: "0", width: "100%", height: "100%",
                minWidth: "0", minHeight: "0", margin: "0", padding: "0", border: "0",
                display: "block", boxSizing: "border-box", overflow: "hidden",
            });
            for (const sibling of child.parentElement?.children || []) {
                if (sibling !== child && sibling instanceof HTMLElement &&
                    !["STYLE", "LINK", "SCRIPT"].includes(sibling.tagName)) sibling.style.setProperty("display", "none", "important");
            }
            child = child.parentElement;
        }
        media.style.objectFit = "contain";
        media.style.visibility = "visible";
    }

    function watchPreview(session) {
        const observer = new MutationObserver(changes => {
            if (changes.some(change => change.type === "attributes" || change.removedNodes.length)) {
                isCurrentPreview(session);
            }
        });
        session.observer = observer;
        observer.observe(session.record.anchor, { attributes: true, attributeFilter: ["href"] });
        observer.observe(session.record.content, { childList: true });
        let root = session.record.anchor.getRootNode();
        while (root) {
            observer.observe(root, { childList: true, subtree: true });
            root = root.host?.getRootNode();
        }
    }

    function schedulePlayer(record) {
        if (hoveredRecord !== record || !record.cover || !record.details ||
            !["video", "bangumi"].includes(record.details.kind) || record.details.playable === false) return;
        stopPreview();
        const session = {
            record, cover: record.cover, details: record.details,
            hoverStarted: record.hoverStarted, route: location.href,
            playerTimer: 0, playerLoadTimer: 0, playerEntry: null,
        };
        activePreview = session;
        if (!isCurrentPreview(session)) return;
        watchPreview(session);
        const remaining = PLAYER_DELAY - (Date.now() - session.hoverStarted);
        if (remaining <= 0) void startPlayer(session);
        else session.playerTimer = setTimeout(() => { void startPlayer(session); }, remaining);
    }

    async function startPlayer(session) {
        if (!isCurrentPreview(session) || session.playerEntry) return;
        session.playerTimer = 0;
        session.cover.setAttribute("data-player", "loading");
        session.playerLoadTimer = setTimeout(() => {
            if (isCurrentPreview(session)) failPlayer(session);
        }, PLAYER_LOAD_TIMEOUT);
        try {
            const sdk = await ensureNano();
            if (!isCurrentPreview(session) || !session.playerLoadTimer) return;
            const entry = createPlayerEntry(sdk, session.details, session.record.resource);
            if (!isCurrentPreview(session)) return;
            entry.owner = session;
            entry.lastUsed = Date.now();
            session.playerEntry = entry;
            entry.container.removeAttribute("data-ready");
            entry.container.style.opacity = "0";
            session.record.host.append(entry.container);
            scheduleCacheCleanup();
            queuePlayback(session, entry);
        } catch {
            if (isCurrentPreview(session)) failPlayer(session);
        }
    }

    function isSupportedPage() {
        return location.protocol === "https:" &&
            (location.hostname === "www.bilibili.com" && /^\/(?:video|opus)\//.test(location.pathname) ||
                location.hostname === "t.bilibili.com" || location.hostname === "space.bilibili.com");
    }

    function owned(node) {
        const element = node instanceof Element ? node : node.parentElement;
        return !!element?.closest(OWN_SELECTOR);
    }

    function resourceFor(anchor) {
        if (!anchor.isConnected || owned(anchor)) return null;
        const resource = parseVideo(anchor);
        return resource?.kind === "user" && anchor.closest(NATIVE_USER_SELECTOR) ? null : resource;
    }

    function rendererFor(node) {
        let current = node instanceof Element ? node : node.host || node.parentElement;
        while (current instanceof Element) {
            if (RENDERERS.has(current.tagName)) return current;
            current = current.parentElement || current.getRootNode().host;
        }
        return null;
    }

    function schedule() {
        if (frame || !inlineEnabled()) return;
        frame = requestAnimationFrame(flush);
    }

    function probe(component, attempt = 0) {
        if (probes.has(component) || attempt >= 4) return;
        const timer = setTimeout(() => {
            probes.delete(component);
            if (!component.isConnected || !inlineEnabled()) return;
            if (component.shadowRoot) { pendingTrees.add(component); schedule(); }
            else probe(component, attempt + 1);
        }, [50, 200, 600, 1800][attempt]);
        probes.set(component, timer);
    }

    function observeRoot(root, owner = null) {
        if (roots.has(root)) return;
        const observer = new MutationObserver(changes => {
            let relevant = false;
            for (const change of changes) {
                if (owned(change.target)) continue;
                const realAdditions = [...change.addedNodes].filter(node => !owned(node));
                if (change.type === "childList" && !realAdditions.length && !change.removedNodes.length) continue;
                const renderer = rendererFor(change.target);
                const touchesDescription = !owner && (descriptionRoot &&
                    (!descriptionRoot.isConnected || descriptionRoot.contains(change.target)) ||
                    change.target instanceof Element && change.target.closest("#v_desc"));
                const candidates = [...realAdditions, ...change.removedNodes].filter(node => node instanceof Element &&
                    (node.matches(`${COMPONENT_SELECTOR},#v_desc`) || node.querySelector(`${COMPONENT_SELECTOR},#v_desc`)));
                if (!owner && !renderer && !touchesDescription && !candidates.length) continue;
                relevant = true;
                for (const node of realAdditions) if (node instanceof Element && (owner || candidates.includes(node))) pendingTrees.add(node);
                if (renderer) dirtyComments.add(renderer);
                if (touchesDescription) descriptionDirty = true;
            }
            if (relevant) schedule();
        });
        observer.observe(root, owner ? { childList: true, subtree: true, attributes: true, attributeFilter: LINK_ATTRIBUTES } :
            { childList: true, subtree: true });
        roots.set(root, { owner, observer });
    }

    function discover(tree) {
        if (owned(tree) || !tree.querySelectorAll) return;
        const components = [...tree.querySelectorAll(COMPONENT_SELECTOR)];
        if (tree instanceof Element && tree.matches(COMPONENT_SELECTOR)) components.unshift(tree);
        for (const component of components) {
            if (owned(component)) continue;
            if (RENDERERS.has(component.tagName)) dirtyComments.add(component);
            else {
                const renderer = rendererFor(component);
                if (renderer) dirtyComments.add(renderer);
            }
            if (component.shadowRoot && !roots.has(component.shadowRoot)) {
                observeRoot(component.shadowRoot, component);
                discover(component.shadowRoot);
            } else if (!component.shadowRoot) probe(component);
        }
        if (tree === document || tree instanceof Element &&
            (tree.matches("#v_desc") || tree.closest("#v_desc") || tree.querySelector("#v_desc"))) descriptionDirty = true;
    }

    function flush() {
        frame = 0;
        if (!inlineEnabled()) return;
        if (route !== location.href) {
            refreshRoute();
            return;
        }
        if (activePreview) isCurrentPreview(activePreview);
        for (const [root, entry] of roots) if (entry.owner && !entry.owner.isConnected) {
            entry.observer.disconnect();
            roots.delete(root);
        }
        for (const [component, timer] of probes) if (!component.isConnected) {
            clearTimeout(timer);
            probes.delete(component);
        }
        for (const [renderer, group] of commentGroups) if (!renderer.isConnected) removeGroup(renderer, group);
        for (const [anchor, record] of descriptionCards) if (!anchor.isConnected) {
            removeCard(record);
            descriptionCards.delete(anchor);
        }
        const trees = [...pendingTrees];
        pendingTrees.clear();
        for (const tree of trees) if (tree === document || tree.isConnected) discover(tree);
        for (const renderer of dirtyComments) if (renderer.isConnected) reconcileComment(renderer);
        dirtyComments.clear();
        if (descriptionDirty) { descriptionDirty = false; reconcileDescription(); }
    }

    function reconcileComment(renderer) {
        const root = renderer.shadowRoot;
        const placement = root?.querySelector("#footer")?.parentElement;
        const resources = new Map();
        for (const rich of root?.querySelectorAll("bili-rich-text") || []) {
            for (const anchor of rich.shadowRoot?.querySelectorAll("a[href]") || []) {
                const resource = resourceFor(anchor);
                if (resource && !resources.has(resource.key)) resources.set(resource.key, { anchor, resource });
            }
        }
        let group = commentGroups.get(renderer);
        if (!placement || !resources.size) {
            if (group) removeGroup(renderer, group);
            return;
        }
        if (!group) {
            const wrapper = document.createElement("div");
            wrapper.setAttribute(GROUP_ATTRIBUTE, "");
            wrapper.style.cssText = "display:grid;gap:4px;min-width:0;max-width:100%;margin:6px 0 2px;";
            group = { wrapper, cards: new Map() };
            commentGroups.set(renderer, group);
        }
        if (placement.lastElementChild !== group.wrapper) placement.append(group.wrapper);
        for (const [key, record] of group.cards) if (!resources.has(key)) {
            removeCard(record);
            group.cards.delete(key);
        }
        let previous = null;
        for (const [key, spec] of resources) {
            let record = group.cards.get(key);
            if (!record) {
                record = createCard(spec.anchor, spec.resource);
                group.cards.set(key, record);
            } else record.anchor = spec.anchor;
            if (!previous && group.wrapper.firstElementChild !== record.host) group.wrapper.prepend(record.host);
            else if (previous && previous.nextElementSibling !== record.host) previous.after(record.host);
            previous = record.host;
            activate(record);
        }
    }

    function reconcileDescription() {
        const nextRoot = location.hostname === "www.bilibili.com" && location.pathname.startsWith("/video/") ?
            document.querySelector("#v_desc") : null;
        if (nextRoot !== descriptionRoot) {
            descriptionObserver?.disconnect();
            descriptionRoot = nextRoot;
            descriptionObserver = null;
            if (nextRoot) {
                descriptionObserver = new MutationObserver(changes => {
                    if (changes.some(change => !owned(change.target) && (change.type === "attributes" ||
                        change.removedNodes.length || [...change.addedNodes].some(node => !owned(node))))) {
                        descriptionDirty = true; schedule();
                    }
                });
                descriptionObserver.observe(nextRoot, { childList: true, subtree: true, attributes: true,
                    attributeFilter: [...LINK_ATTRIBUTES, "id", "class"] });
            }
        }
        const seen = new Set();
        const parents = new Set();
        for (const anchor of nextRoot?.querySelectorAll(DESCRIPTION_LINK_SELECTOR) || []) {
            const resource = resourceFor(anchor);
            if (!resource) continue;
            seen.add(anchor);
            let record = descriptionCards.get(anchor);
            if (record && record.resource.key !== resource.key) { removeCard(record); record = null; }
            if (!record) { record = createCard(anchor, resource); descriptionCards.set(anchor, record); }
            if (anchor.nextSibling !== record.host) anchor.after(record.host);
            parents.add(anchor.closest(DESCRIPTION_SELECTOR));
            activate(record);
        }
        for (const [anchor, record] of descriptionCards) if (!seen.has(anchor)) {
            removeCard(record); descriptionCards.delete(anchor);
        }
        // 卡片在地址下方参与正常排版，避免被简介原有的折叠高度裁掉；不改写原文或内联样式。
        for (const parent of expandedParents) if (!parents.has(parent)) parent.removeAttribute(EXPANDED_ATTRIBUTE);
        expandedParents.clear();
        for (const parent of parents) if (parent) { parent.setAttribute(EXPANDED_ATTRIBUTE, ""); expandedParents.add(parent); }
    }

    function createCard(anchor, resource) {
        const host = document.createElement("div");
        host.setAttribute(CARD_ATTRIBUTE, resource.key);
        host.setAttribute("role", "region");
        host.setAttribute("aria-label", "链接解析卡片");
        const shadow = host.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = CARD_CSS + SHARED_CARD_CSS;
        const content = document.createElement("div");
        const record = { anchor, resource, host, content, unsubscribe: null, near: !visibility, loaded: false, observed: false,
            expires: 0, details: null, cover: null, hoverStarted: 0 };
        shadow.append(style, content, createSettings(host, () => record.anchor));
        host.addEventListener("pointerenter", event => {
            if (event.pointerType === "touch" || hover.isOpen()) return;
            cancelPreview();
            hoveredRecord = record;
            record.hoverStarted = Date.now();
            schedulePlayer(record);
        }, { passive: true });
        host.addEventListener("pointerleave", () => {
            if (hoveredRecord === record) hoveredRecord = null;
            stopPreview(record);
        }, { passive: true });
        records.add(record);
        recordsByHost.set(host, record);
        showStatus(record, "等待解析链接…");
        return record;
    }

    function activate(record) {
        updateTheme(record.host, record.anchor);
        if (record.observed) {
            if (record.near && !record.loaded && !record.unsubscribe) subscribe(record);
            return;
        }
        record.observed = true;
        if (visibility) visibility.observe(record.host);
        else subscribe(record);
    }

    function updateTheme(host, anchor) {
        let dark = themeQuery.matches;
        let node = anchor;
        while (node instanceof Element) {
            const parts = getComputedStyle(node).backgroundColor.match(/[\d.]+/g)?.map(Number);
            if (parts?.length >= 3 && (parts.length < 4 || parts[3] >= .95)) {
                dark = parts[0] * .299 + parts[1] * .587 + parts[2] * .114 < 128; break;
            }
            node = node.parentElement || node.getRootNode().host;
        }
        host.toggleAttribute("data-dark", dark);
    }

    function showStatus(record, message, retry = false) {
        stopPreview(record);
        record.details = null;
        record.cover = null;
        const status = document.createElement("div");
        status.className = "status";
        status.setAttribute("role", "status");
        status.append(document.createTextNode(message));
        if (retry) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = "重新解析";
            button.addEventListener("click", () => {
                if (!records.has(record) || record.unsubscribe) return;
                cache.delete(record.resource.key);
                record.loaded = false;
                subscribe(record);
            });
            status.append(button);
        }
        record.content.replaceChildren(status);
    }

    function readCache(key) {
        const entry = cache.get(key);
        if (!entry) return null;
        cache.delete(key);
        if (entry.expires <= Date.now()) return null;
        cache.set(key, entry);
        return entry;
    }

    function display(record, result) {
        if (!inlineEnabled() || route !== location.href || !records.has(record) || !record.host.isConnected ||
            resourceFor(record.anchor)?.key !== record.resource.key) return;
        record.loaded = true;
        record.expires = result.expires;
        if (result.error) showStatus(record, result.error, true);
        else {
            stopPreview(record);
            const card = renderResource(result.data, record.resource);
            record.content.replaceChildren(card);
            record.details = result.data;
            record.cover = card.querySelector(".cover");
            updateTheme(record.host, record.anchor);
            schedulePlayer(record);
        }
    }

    function subscribe(record) {
        if (!inlineEnabled() || record.unsubscribe || !records.has(record) || !record.host.isConnected) return;
        record.unsubscribe = subscribeResource(record.resource, result => {
            record.unsubscribe = null;
            display(record, result);
        });
        if (record.unsubscribe) showStatus(record, "正在解析链接…");
    }

    function unsubscribe(record) {
        record.unsubscribe?.();
        record.unsubscribe = null;
    }

    function subscribeResource(resource, receive, priority = false) {
        const cached = readCache(resource.key);
        if (cached) {
            receive(cached);
            return null;
        }
        let task = tasks.get(resource.key);
        if (!task) {
            task = { resource, subscribers: new Set(), controller: new AbortController(), state: "queued" };
            tasks.set(resource.key, task);
            if (priority) queue.unshift(task);
            else queue.push(task);
        } else if (priority && task.state === "queued") {
            const index = queue.indexOf(task);
            if (index > 0) {
                queue.splice(index, 1);
                queue.unshift(task);
            }
        }
        task.subscribers.add(receive);
        pump();
        return () => {
            if (!task.subscribers.delete(receive) || task.subscribers.size) return;
            task.controller.abort();
            if (tasks.get(resource.key) === task) tasks.delete(resource.key);
            const index = queue.indexOf(task);
            if (index >= 0) queue.splice(index, 1);
        };
    }

    function pump() {
        if (stopped || running || pumpTimer) return;
        while (queue.length && (!queue[0].subscribers.size || queue[0].controller.signal.aborted)) queue.shift();
        if (!queue.length) return;
        const delay = REQUEST_GAP - (Date.now() - lastRequestTime);
        if (delay > 0) { pumpTimer = setTimeout(() => { pumpTimer = 0; pump(); }, delay); return; }
        const task = queue.shift();
        running = task; task.state = "running"; lastRequestTime = Date.now();
        void runTask(task);
    }

    async function runTask(task) {
        let timedOut = false;
        const timeout = setTimeout(() => { timedOut = true; task.controller.abort(); }, REQUEST_TIMEOUT);
        try {
            const data = await requestResource(task.resource, task.controller.signal);
            if (!task.controller.signal.aborted && task.subscribers.size) publish(task, { data });
        } catch (error) {
            if (task.subscribers.size && (timedOut || !task.controller.signal.aborted)) {
                const message = timedOut ? "预览信息请求超时，请稍后重试" :
                    error instanceof Error && /^(视频信息|番剧信息|直播间信息|图文信息|用户信息|预览信息)/.test(error.message) ?
                        error.message : "暂时无法解析此链接。";
                publish(task, { error: message });
            }
        } finally {
            clearTimeout(timeout);
            task.subscribers.clear();
            if (tasks.get(task.resource.key) === task) tasks.delete(task.resource.key);
            if (running === task) running = null;
            pump();
        }
    }

    function publish(task, result) {
        const ttl = result.error ? ERROR_TTL : task.resource.kind === "live" ? LIVE_CACHE_TTL : CACHE_TTL;
        cache.delete(task.resource.key);
        const entry = { ...result, expires: Date.now() + ttl };
        cache.set(task.resource.key, entry);
        if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
        for (const receive of task.subscribers) receive(entry);
    }

    function removeCard(record) {
        if (openSettings?.owner === record.host) closeSettings();
        if (hoveredRecord === record) hoveredRecord = null;
        stopPreview(record);
        records.delete(record);
        recordsByHost.delete(record.host);
        visibility?.unobserve(record.host);
        unsubscribe(record);
        record.host.remove();
    }

    function removeGroup(renderer, group) {
        for (const record of group.cards.values()) removeCard(record);
        group.wrapper.remove(); commentGroups.delete(renderer);
    }

    function clearCards() {
        cancelPreview();
        for (const [renderer, group] of commentGroups) removeGroup(renderer, group);
        for (const record of descriptionCards.values()) removeCard(record);
        descriptionCards.clear();
        for (const parent of expandedParents) parent.removeAttribute(EXPANDED_ATTRIBUTE);
        expandedParents.clear();
    }

    function startInline() {
        observeRoot(document);
        pendingTrees.add(document); descriptionDirty = true; schedule();
    }

    function stopInline() {
        cancelAnimationFrame(frame); frame = 0;
        for (const entry of roots.values()) entry.observer.disconnect();
        roots.clear();
        descriptionObserver?.disconnect(); descriptionObserver = null; descriptionRoot = null;
        for (const timer of probes.values()) clearTimeout(timer);
        probes.clear(); pendingTrees.clear(); dirtyComments.clear();
        clearCards();
        for (const entry of players.values()) disposeEntry(entry);
        clearTimeout(playerCacheTimer); playerCacheTimer = 0;
    }

    function readMode() {
        try {
            const saved = typeof GM_getValue === "function" ? GM_getValue(MODE_KEY, "inline") : "inline";
            return MODES.has(saved) ? saved : "inline";
        } catch { return "inline"; }
    }

    function setMode(nextMode) {
        if (!MODES.has(nextMode) || nextMode === mode) return;
        const hadInline = inlineEnabled();
        mode = nextMode;
        try { if (typeof GM_setValue === "function") GM_setValue(MODE_KEY, mode); } catch {}
        if (!hoverEnabled()) hover.dispose();
        if (hadInline && !inlineEnabled()) stopInline();
        if (!hadInline && inlineEnabled() && isSupportedPage()) startInline();
    }

    function inlineEnabled() {
        return !stopped && mode !== "hover";
    }

    function hoverEnabled() {
        return !stopped && mode !== "inline" && isSupportedPage();
    }

    function syncPage() {
        if (isSupportedPage() && inlineEnabled()) startInline();
    }

    function refreshRoute() {
        if (stopped || route === location.href) return;
        route = location.href;
        hover.close();
        stopInline();
        syncPage();
    }

    function closeSettings(restoreFocus = false) {
        if (!openSettings) return;
        const { gear, options } = openSettings;
        openSettings = null;
        options.remove();
        gear.setAttribute("aria-expanded", "false");
        if (restoreFocus) gear.focus({ preventScroll: true });
    }

    function createSettings(owner, getAnchor) {
        const control = document.createElement("div");
        control.className = "card-settings";
        const gear = document.createElement("button");
        gear.className = "gear";
        gear.type = "button";
        gear.title = "链接卡片设置";
        gear.setAttribute("aria-label", gear.title);
        gear.setAttribute("aria-expanded", "false");
        gear.textContent = "⚙︎";
        control.append(gear);

        gear.addEventListener("click", () => {
            const wasOpen = openSettings?.gear === gear;
            closeSettings();
            if (wasOpen) return;
            const options = document.createElement("div");
            options.className = "options";
            options.setAttribute("role", "group");
            options.setAttribute("aria-label", "卡片显示方式");

            let selected;
            for (const [value, label] of MODES) {
                const option = document.createElement("button");
                option.type = "button";
                option.dataset.mode = value;
                option.textContent = label;
                option.setAttribute("aria-pressed", String(value === mode));
                if (value === mode) selected = option;
                option.addEventListener("click", () => {
                    const anchor = getAnchor();
                    closeSettings();
                    setMode(value);
                    const focusTarget = gear.isConnected && !owner.hidden ? gear : anchor;
                    focusTarget?.focus({ preventScroll: true });
                });
                options.append(option);
            }
            control.append(options);
            openSettings = { owner, control, gear, options };
            gear.setAttribute("aria-expanded", "true");
            const { top, bottom } = gear.getBoundingClientRect();
            const spaceBelow = innerHeight - bottom;
            options.toggleAttribute("data-above", options.offsetHeight > spaceBelow && top > spaceBelow);
            selected?.focus({ preventScroll: true });
        });
        return control;
    }


    function createHoverCard() {
        const HOST_ID = "bilibili-link-cards-hover";
        const DESCRIPTION_ID = "v_desc";
        const NATIVE_USER_ATTRIBUTES = ["data-user-profile-id", "data-type"];
        const CLOSE_DELAY = 200;
        const HOVER_DELAY = 220;
        const PLAYER_DELAY = 560;
        const PLAYER_SLOT = "preview-media";
        const PLAYER_CACHE_SLOT = "preview-cache";
        const EDGE_GAP = 12;
        const ANCHOR_GAP = 4;
        const CARD_WIDTH = 366;
        const MIN_COVER_HEIGHT = 72;
        const COVER_HEIGHT_PROPERTY = "--bili-link-cards-hover-cover-height";
        const LIVE_PLAY_API_URL = "https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo";
        // 与直播分区卡片相同的 bilibili/flv.js 1.6.2（Apache-2.0）；只加载固定版本，不打包第三方代码。
        // 来源：https://github.com/bilibili/flv.js/tree/v1.6.2
        const FLV_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/flv.js@1.6.2/dist/flv.min.js";

        const host = document.createElement("div");
        host.id = HOST_ID;
        host.hidden = true;
        const shadow = host.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        // 时长沿用 B 站动态卡片的 46px 渐变遮罩及 13px 白字定位。
        // 来源：https://s1.hdslb.com/bfs/static/2233-monorepo/dyn-home/static/css/index.63fa13e0.css
        style.textContent = `
            :host {
                all: initial;
                position: fixed;
                z-index: 2147483646;
                width: min(${CARD_WIDTH}px, calc(100vw - ${EDGE_GAP * 2}px));
            }
            :host([hidden]) { display: none !important; }
            .card {
                box-sizing: border-box;
                width: 100%;
                max-height: var(--bili-link-cards-hover-height);
                overflow: hidden auto;
                border: 1px solid rgba(128, 128, 128, .22);
                border-radius: 10px;
                background: #fff;
                color: #18191c;
                box-shadow: 0 6px 24px rgba(0, 0, 0, .18);
                font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
                overflow-wrap: anywhere;
            }
            .cover {
                position: relative;
                display: grid;
                place-items: center;
                aspect-ratio: 16 / 9;
                max-height: var(${COVER_HEIGHT_PROPERTY}, none);
                overflow: hidden;
                background: #f1f2f3;
                color: #777;
                font-size: 12px;
            }
            .cover img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: cover; }
            .resource-badge { position: absolute; top: 8px; left: 8px; z-index: 3; padding: 2px 7px; border-radius: 4px; background: rgba(24, 25, 28, .72); color: #fff; font-size: 12px; }
            .resource-badge[data-live] { background: #fb7299; }
            ::slotted(.bilibili-comment-preview-media) {
                position: absolute;
                inset: 0;
                z-index: 2;
                width: 100%;
                height: 100%;
                opacity: 0;
                pointer-events: none;
                overflow: hidden;
            }
            ::slotted(.bilibili-comment-preview-media[data-ready]) {
                transition: opacity 180ms ease-out;
            }
            @media (prefers-reduced-motion: reduce) {
                ::slotted(.bilibili-comment-preview-media[data-ready]) { transition: none; }
            }
            .cover::after {
                content: "";
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 46px;
                background: linear-gradient(transparent, rgba(0, 0, 0, .5) 99.32%);
            }
            .duration {
                position: absolute;
                right: 8px;
                bottom: 11px;
                z-index: 1;
                color: #fff;
                font-size: 13px;
                font-weight: 400;
                line-height: 18px;
                font-variant-numeric: tabular-nums;
                white-space: nowrap;
            }
            .info { padding: 11px 30px 11px 13px; }
            .summary { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; margin-top: 6px; color: #61666d; font-size: 12px; white-space: pre-line; }
            .title {
                display: -webkit-box;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: 2;
                overflow: hidden;
                font-weight: 600;
            }
            .meta { display: flex; align-items: center; gap: 8px; margin-top: 8px; color: #61666d; font-size: 11px; line-height: 18px; }
            .metric { display: inline-flex; flex: none; align-items: center; gap: 4px; white-space: nowrap; }
            .metric svg { flex: none; width: 16px; height: 16px; }
            .meta time { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-variant-numeric: tabular-nums; }
            .owner { flex: 0 1 auto; min-width: 2em; max-width: 30%; margin-left: auto; overflow: hidden; color: #61666d; text-align: right; text-overflow: ellipsis; white-space: nowrap; }
            .status { padding: 18px 30px 18px 14px; color: #61666d; }
            :host([data-dark]) .card { background: #202124; color: #f1f2f3; }
            :host([data-dark]) .cover { background: #303236; color: #aaa; }
            :host([data-dark]) .meta, :host([data-dark]) .owner, :host([data-dark]) .status, :host([data-dark]) .summary { color: #b0b3b8; }
            /* B 站动态页用户卡原生样式与图标（2026-10-21）。
               来源：index.63fa13e0.css / index.c648f6cd.js，s1.hdslb.com/bfs/static/2233-monorepo/dyn-home/static/ */
            .bili-user-profile-view { -webkit-font-smoothing:antialiased;width:100%;font-weight:400;font-family:PingFang SC,HarmonyOS_Regular,Helvetica Neue,Microsoft YaHei,sans-serif!important }
            .bili-user-profile-view { font-family:-apple-system,BlinkMacSystemFont,Helvetica Neue,Helvetica,Arial,PingFang SC,Hiragino Sans GB,Microsoft YaHei,sans-serif!important }
            .bili-user-profile-view__background { background-position:50%;background-repeat:no-repeat;background-size:cover;border-radius:8px 8px 0 0;width:366px;height:85px;position:absolute;top:0;left:0;overflow:hidden }
            .bili-user-profile-view__avatar { border-radius:50%;width:48px;height:48px;position:absolute;top:95px;left:10px }
            .bili-user-profile-view__avatar__face { border-radius:50%;width:100%;height:100% }
            .bili-user-profile-view__avatar__icon { background-color:var(--text_white);background-position:50%;background-repeat:no-repeat;background-size:cover;border-radius:50%;width:14px;height:14px;position:absolute;top:34px;right:0 }
            .bili-user-profile-view__info { box-sizing:border-box;padding:97px 20px 16px 70px }
            .bili-user-profile-view__info__header { align-items:center;height:21px;padding-bottom:10px;display:flex }
            .bili-user-profile-view__info__uname { color:var(--text1);cursor:pointer;font-size:14px;font-weight:700 }
            .bili-user-profile-view__info__uname.render-style { -webkit-text-fill-color:transparent;-webkit-background-clip:text;background-clip:text;background-image:var(--name-render-bg-light) }
            .bili-user-profile-view__info__gender { background-position:50%;background-repeat:no-repeat;background-size:cover;width:16px;height:16px;margin-left:6px;display:block }
            .bili-user-profile-view__info__level { height:22px }
            .bili-user-profile-view__info__level img { width:21px;margin:0 4px }
            .bili-user-profile-view__info__viplabel { background:var(--brand_pink);box-sizing:border-box;color:var(--text_white);white-space:nowrap;border-radius:2px;max-width:58px;height:16px;margin-left:0;font-size:12px;font-weight:400;line-height:16px;overflow:hidden }
            .bili-user-profile-view__info__viplabel__text { transform-origin:50%;justify-content:center;align-items:center;display:flex;transform:scale(.83) }
            .bili-user-profile-view__info__stats { align-items:center;padding-bottom:10px;font-size:12px;display:flex }
            .bili-user-profile-view__info__stat { color:var(--text3);padding-right:18px }
            .bili-user-profile-view__info__stat span { color:var(--text1);margin-right:3px;display:inline-block }
            .bili-user-profile-view__info__officialverify { color:var(--text3);margin-bottom:10px;font-size:12px;line-height:17px }
            .bili-user-profile-view__info__officialverify i { vertical-align:sub;background-position:50%;background-repeat:no-repeat;background-size:cover;width:14px;height:14px;margin-right:2px;display:inline-block }
            .bili-user-profile-view__info__signature { -webkit-line-clamp:2;color:var(--text3);text-overflow:ellipsis;word-break:break-all;-webkit-box-orient:vertical;line-height:16px;display:-webkit-box;overflow:hidden }
            .bili-user-profile-view__info__footer { align-items:center;margin-top:16px;display:flex }
            .bili-user-profile-view__info__button { cursor:pointer;border-style:solid;border-width:1px;border-radius:3px;justify-content:center;align-items:center;width:100px;height:30px;font-size:14px;transition:all .3s;display:flex }
            .bili-user-profile-view__info__button.chat { border-color:var(--text3);color:var(--text2);background-color:#0000 }
            .bili-user-profile-view__info__button.chat:hover { border-color:var(--brand_blue);color:var(--brand_blue) }
            .bili_dark .bili-user-profile-view__info__uname.render-style { background-image:var(--name-render-bg-dark) }
            .bili-user-profile { background-color:var(--bg1_float);color:var(--text3);border-radius:8px;width:366px;font-size:12px;position:absolute;box-shadow:0 0 30px 2px #0000001a }
            .bili-user-profile__content { width:100% }
            .bili-user-profile__error,.bili-user-profile__loading { background-color:var(--graph_weak);color:var(--text2);padding:15px 20px;font-size:12px }
            .bili-user-profile-transition-enter-active,.bili-user-profile-transition-leave-active { transition:opacity .2s }
            .bili-user-profile-transition-enter,.bili-user-profile-transition-leave-to { opacity:0 }
            .bili-user-profile {
                --text1: #18191c; --text2: #61666d; --text3: #9499a0; --text_white: #fff;
                --bg1_float: #fff; --brand_blue: #00aeec; --brand_pink: #fb7299;
                --graph_bg_thick: #e3e5e7; --graph_bg_regular: #f1f2f3;
                position: relative;
                width: 100%;
                max-height: var(--bili-link-cards-hover-height);
                overflow: hidden auto;
            }
            .bili-user-profile a { text-decoration: none; }
            .bili-user-profile-view__background { width: 100%; object-fit: cover; background: #f1f2f3; }
            .bili-user-profile-view__avatar__face { display: block; object-fit: cover; }
            .bili-user-profile-view__avatar-fallback { display: grid; place-items: center; width: 100%; height: 100%; border-radius: 50%; background: #e3e5e7; color: #9499a0; font-size: 18px; }
            .bili-user-profile-view__info__uname { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
            .bili-user-profile-view__info__gender, .bili-user-profile-view__info__level, .bili-user-profile-view__info__viplabel { flex-shrink: 0; }
            .bili-user-profile-view__info__signature { white-space: pre-line; }
            .bili-user-profile a:focus-visible { outline: 2px solid #00aeec; outline-offset: 2px; }
            :host([data-dark]) .bili-user-profile {
                --text1: #e1e2e5; --text2: #a2a7ae; --text3: #9499a0; --bg1_float: #202124;
                --graph_bg_thick: #353638; --graph_bg_regular: #303236;
            }
            @media (max-width: 390px) {
                .bili-user-profile-view__info { padding-left: 64px; padding-right: 12px; }
                .bili-user-profile-view__info__stats { flex-wrap: wrap; row-gap: 4px; }
                .bili-user-profile-view__info__stat { padding-right: 10px; font-size: 11px; }
            }
            @media (prefers-reduced-motion: reduce) {
                .bili-user-profile-view__info__button { transition: none; }
            }
        ` + SHARED_CARD_CSS;
        const panel = document.createElement("div");
        panel.className = "card";
        panel.setAttribute("role", "group");
        shadow.append(style, panel, createSettings(host, () => active?.anchor));
        document.documentElement.append(host);

        const players = new Map();
        let flvTask = null;
        let playerCacheTimer = 0;
        let active = null;
        let hoverTimer = 0;
        let closeTimer = 0;

        function isLinkInScope(anchor) {
            // 简介为普通 DOM；只在视频页的简介正文内启用，不触发 UP 信息、标签或推荐链接。
            if (location.hostname === "www.bilibili.com" && location.pathname.startsWith("/video/") &&
                anchor.matches(DESCRIPTION_LINK_SELECTOR)) return true;
            let richText = false;
            let renderer = false;
            let node = anchor;
            while (node instanceof Element) {
                richText ||= node.tagName === "BILI-RICH-TEXT";
                renderer ||= RENDERERS.has(node.tagName);
                if (richText && renderer) return true;
                node = node.parentElement || node.getRootNode().host;
            }
            return false;
        }

        function findLink(event) {
            if (!isSupportedPage()) return null;
            const anchor = event.composedPath().find(node => node instanceof HTMLAnchorElement);
            if (!anchor || !isLinkInScope(anchor)) return null;
            const video = resourceFor(anchor);
            if (video) return { anchor, video };
            return hasNativeUserCard(anchor) && parseVideo(anchor)?.kind === "user" ? { nativeUser: true } : null;
        }

        function hasNativeUserCard(anchor) {
            return !!anchor.closest(NATIVE_USER_SELECTOR);
        }

        function closePreview() {
            if (!active) return;
            const session = active;
            active = null;
            clearTimeout(hoverTimer);
            clearTimeout(closeTimer);
            hoverTimer = 0;
            closeTimer = 0;
            session.linkObserver?.disconnect();
            session.unsubscribe?.();
            stopPlayer(session);
            if (openSettings?.owner === host) closeSettings();
            host.hidden = true;
            panel.className = "card";
            panel.setAttribute("role", "group");
            panel.removeAttribute("aria-label");
            panel.replaceChildren();
        }

        function deferClose(nextLink) {
            const session = active;
            session.nextLink = nextLink;
            if (closeTimer) return;
            closeTimer = setTimeout(() => {
                closeTimer = 0;
                if (active !== session) return;
                const next = session.nextLink;
                closePreview();
                if (next && isLinkInScope(next.anchor) && resourceFor(next.anchor)?.key === next.video.key) {
                    beginPreview(next);
                }
            }, CLOSE_DELAY);
        }

        function stopPlayer(session) {
            if (!session) return;
            session.streamController?.abort();
            session.streamController = null;
            clearTimeout(session.playerTimer);
            clearTimeout(session.playerLoadTimer);
            session.playerTimer = 0;
            session.playerLoadTimer = 0;
            session.cancelFrame?.();
            session.cancelFrame = null;
            const entry = session.playerEntry;
            session.playerEntry = null;
            if (entry?.owner === session) {
                entry.container.removeAttribute("data-ready");
                entry.container.style.opacity = "0";
                entry.container.slot = PLAYER_CACHE_SLOT;
                entry.owner = null;
                entry.lastUsed = Date.now();
                entry.needsReset = true;
                pauseEntry(entry);
                if (entry.live) disposeEntry(entry);
                // 点播沿用搜索页的暂停缓存；直播立即释放连接，重入时获取实时流。
                scheduleCacheCleanup();
            }
            session.cover?.removeAttribute("data-player");
        }

        function disposeEntry(entry) {
            if (entry.disposed) return;
            entry.disposed = true;
            if (entry.owner) stopPlayer(entry.owner);
            pauseEntry(entry);
            entry.media?.removeEventListener("playing", entry.guardPlayback);
            entry.media?.removeEventListener("error", entry.onError);
            if (entry.sdk.EventType?.Player_Error) {
                try { entry.player.off?.(entry.sdk.EventType.Player_Error, entry.onError); } catch {}
            }
            if (entry.sdk.EventType?.Player_Ended) {
                try { entry.player.off?.(entry.sdk.EventType.Player_Ended, entry.onEnded); } catch {}
            }
            try { entry.player.disconnect(); } catch {}
            entry.container.remove();
            if (players.get(entry.key) === entry) players.delete(entry.key);
        }

        function scheduleCacheCleanup() {
            clearTimeout(playerCacheTimer);
            let next = Infinity;
            for (const entry of players.values()) {
                if (entry.owner) continue;
                const remaining = entry.lastUsed + PLAYER_CACHE_TTL - Date.now();
                if (remaining <= 0) disposeEntry(entry);
                else next = Math.min(next, remaining);
            }
            playerCacheTimer = Number.isFinite(next) ? setTimeout(scheduleCacheCleanup, next) : 0;
        }

        function ownsPlayer(session, entry) {
            return !entry.disposed && entry.owner === session &&
                session.playerEntry === entry && isCurrent(session);
        }

        function failPlayer(session, entry = session.playerEntry) {
            if (entry && !ownsPlayer(session, entry)) return;
            stopPlayer(session);
            if (entry) disposeEntry(entry);
        }

        function createMediaContainer() {
            const container = document.createElement("div");
            container.className = "bilibili-comment-preview-media";
            container.slot = PLAYER_CACHE_SLOT;
            container.inert = true;
            container.tabIndex = -1;
            container.setAttribute("aria-hidden", "true");
            // nano 向 document 注入样式；light DOM + slot 保持其原生样式和卡片的 Shadow DOM 布局。
            host.append(container);
            return container;
        }

        function ensureFlv() {
            if (typeof PAGE_WINDOW.flvjs?.createPlayer === "function") return Promise.resolve(PAGE_WINDOW.flvjs);
            if (flvTask) return flvTask;
            flvTask = new Promise((resolve, reject) => {
                const script = document.createElement("script");
                const finish = () => {
                    clearTimeout(timeout);
                    script.remove();
                    script.onload = null;
                    script.onerror = null;
                };
                const failed = () => { finish(); reject(new Error("直播播放器加载失败")); };
                const timeout = setTimeout(failed, PLAYER_LOAD_TIMEOUT);
                script.onload = () => {
                    finish();
                    const sdk = PAGE_WINDOW.flvjs;
                    if (typeof sdk?.createPlayer === "function") resolve(sdk);
                    else reject(new Error("直播播放器不可用"));
                };
                script.onerror = failed;
                script.src = FLV_SCRIPT_URL;
                script.crossOrigin = "anonymous";
                script.referrerPolicy = "no-referrer";
                (document.head || document.documentElement).append(script);
            }).finally(() => { flvTask = null; });
            return flvTask;
        }

        function liveStreamUrl(payload) {
            const data = payload?.data;
            if (payload?.code !== 0 || data?.live_status !== 1 || data.is_hidden || data.is_locked ||
                (data.encrypted && !data.pwd_verified)) return "";
            const streams = data.playurl_info?.playurl?.stream;
            if (!Array.isArray(streams)) return "";
            for (const stream of streams) {
                if (stream.protocol_name !== "http_stream" || !Array.isArray(stream.format)) continue;
                for (const format of stream.format) {
                    if (format.format_name !== "flv" || !Array.isArray(format.codec)) continue;
                    for (const codec of format.codec) {
                        if (codec.codec_name !== "avc" || typeof codec.base_url !== "string" ||
                            !Array.isArray(codec.url_info)) continue;
                        for (const info of codec.url_info) {
                            if (typeof info.host !== "string" || typeof info.extra !== "string") continue;
                            try {
                                const url = new URL(info.host + codec.base_url + info.extra);
                                if (url.protocol === "https:" && /(^|\.)bilivideo\.com$/.test(url.hostname) &&
                                    !url.username && !url.password && !url.port) return url.href;
                            } catch {}
                        }
                    }
                }
            }
            return "";
        }

        async function startLivePlayer(session) {
            if (session.details.liveStatus !== 1 || !session.details.playable) return;
            const controller = new AbortController();
            session.streamController = controller;
            // 与直播分区卡片相同的公开预览请求；不缓存带时效的流地址，不处理登录/风控挑战。
            const query = new URLSearchParams({
                room_id: String(session.details.roomId), no_playurl: "0", mask: "1", qn: "0",
                platform: "web", protocol: "0,1", format: "0,1,2", codec: "0,1", special_scenario: "2",
            });
            const response = await fetch(`${LIVE_PLAY_API_URL}?${query}`, {
                credentials: "omit", referrerPolicy: "no-referrer", signal: controller.signal,
            });
            if (!response.ok) throw new Error("直播预览暂不可用");
            const payload = await response.json();
            if (!isCurrent(session) || !session.playerLoadTimer) return;
            const streamUrl = liveStreamUrl(payload);
            if (!streamUrl) {
                if (payload.code === 0 && payload.data?.live_status !== 1) {
                    cache.delete(session.video.key);
                    const badge = session.cover.querySelector(".resource-badge");
                    if (badge) {
                        badge.textContent = payload.data?.live_status === 2 ? "轮播中" : "未开播";
                        badge.removeAttribute("data-live");
                    }
                }
                throw new Error("直播预览暂不可用");
            }
            const sdk = await ensureFlv();
            if (!isCurrent(session) || !session.playerLoadTimer) return;
            if (!sdk.isSupported()) throw new Error("浏览器不支持直播预览");
            const container = createMediaContainer();
            const media = document.createElement("video");
            media.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:contain";
            media.muted = true;
            media.playsInline = true;
            media.tabIndex = -1;
            container.append(media);
            let flv = null;
            let destroyed = false;
            const entry = {
                key: session.video.key, container, media, owner: session, live: true, sdk: {}, disposed: false,
                player: {
                    pause() { flv?.pause(); },
                    disconnect() {
                        if (destroyed) return;
                        destroyed = true;
                        for (const method of ["unload", "detachMediaElement", "destroy"]) {
                            try { flv?.[method](); } catch {}
                        }
                        media.removeAttribute("src");
                        media.load();
                    },
                },
            };
            session.playerEntry = entry;
            entry.onError = () => { if (entry.owner) failPlayer(entry.owner, entry); };
            entry.guardPlayback = () => { if (!ownsPlayer(session, entry)) pauseEntry(entry); };
            media.addEventListener("error", entry.onError);
            media.addEventListener("playing", entry.guardPlayback);
            container.slot = PLAYER_SLOT;
            try {
                flv = sdk.createPlayer({
                    type: "flv", url: streamUrl, isLive: true, hasAudio: false, hasVideo: true, withCredentials: false,
                }, { enableStashBuffer: false, autoCleanupSourceBuffer: true });
                flv.on(sdk.Events.ERROR, entry.onError);
                flv.on(sdk.Events.LOADING_COMPLETE, () => {
                    if (entry.owner === session && isCurrent(session)) {
                        stopPlayer(session);
                        cache.delete(session.video.key);
                        const badge = session.cover.querySelector(".resource-badge");
                        if (badge) {
                            badge.textContent = "预览已结束";
                            badge.removeAttribute("data-live");
                        }
                    }
                });
                flv.attachMediaElement(media);
                waitForFrame(session, entry, ownsPlayer);
                flv.load();
                await flv.play();
                if (!ownsPlayer(session, entry)) pauseEntry(entry);
            } catch (error) {
                disposeEntry(entry);
                throw error;
            }
        }

        function createPlayerEntry(sdk, video, fallbackKey) {
            const key = `${video.kind}:` + (video.cid ? `cid=${video.cid}` : video.bvid ? `bvid=${video.bvid}` : fallbackKey);
            const cached = players.get(key);
            if (cached && !cached.disposed) return cached;
            // 只缓存最近两个预览，避免连续浏览评论时积累播放器及缓冲。
            if (players.size >= PLAYER_CACHE_LIMIT) {
                const oldest = Array.from(players.values()).filter(entry => !entry.owner)
                    .sort((a, b) => a.lastUsed - b.lastUsed)[0];
                if (oldest) disposeEntry(oldest);
            }
            const container = createMediaContainer();
            const player = createNanoPlayer(sdk, video, fallbackKey, container);
            const entry = {
                key, container, player, sdk, owner: null, media: null,
                connected: false, disposed: false, needsReset: false,
                lastUsed: Date.now(), task: Promise.resolve(),
            };
            entry.onError = () => {
                if (entry.owner) failPlayer(entry.owner, entry);
                else disposeEntry(entry);
            };
            entry.onEnded = () => {
                if (entry.owner) {
                    entry.needsReset = true;
                    queuePlayback(entry.owner, entry);
                }
            };
            if (sdk.EventType?.Player_Error) player.on(sdk.EventType.Player_Error, entry.onError);
            if (sdk.EventType?.Player_Ended) player.on(sdk.EventType.Player_Ended, entry.onEnded);
            players.set(key, entry);
            return entry;
        }

        function queuePlayback(session, entry) {
            // 串行化同一实例的 connect / seek / play，避免快速 A→B→A 时旧异步操作影响新悬停。
            entry.task = entry.task.then(async () => {
                if (!ownsPlayer(session, entry)) return;
                if (!entry.connected) {
                    if (!await entry.player.connect()) throw new Error("播放器连接失败");
                    entry.connected = true;
                    if (entry.disposed) {
                        pauseEntry(entry);
                        try { entry.player.disconnect(); } catch {}
                        return;
                    }
                }
                if (!ownsPlayer(session, entry)) return;
                if (entry.needsReset) {
                    await entry.player.seek(0);
                    entry.needsReset = false;
                }
                if (!ownsPlayer(session, entry)) return;
                const media = entry.container.querySelector("video");
                if (!media) throw new Error("播放器未创建视频元素");
                if (entry.media !== media) {
                    entry.media?.removeEventListener("playing", entry.guardPlayback);
                    entry.media?.removeEventListener("error", entry.onError);
                    entry.media = media;
                    entry.guardPlayback = () => {
                        if (!entry.owner || !ownsPlayer(entry.owner, entry)) pauseEntry(entry);
                    };
                    media.addEventListener("playing", entry.guardPlayback);
                    media.addEventListener("error", entry.onError);
                }
                media.muted = true;
                media.playsInline = true;
                media.tabIndex = -1;
                waitForFrame(session, entry, ownsPlayer);
                await entry.player.play();
                if (!entry.owner || entry.disposed) pauseEntry(entry);
            }).catch(() => {
                // 失败时保留封面；过期任务不得关闭另一个悬停已接管的实例。
                if (entry.owner === session) failPlayer(session, entry);
                else if (!entry.owner) disposeEntry(entry);
            });
        }

        function schedulePlayer(session, cover, video) {
            if (!isCurrent(session)) return;
            session.cover = cover;
            session.details = video;
            if (!["video", "bangumi", "live"].includes(video.kind) || video.playable === false) return;
            const remaining = PLAYER_DELAY - (Date.now() - session.hoverStarted);
            if (remaining <= 0) void startPlayer(session);
            else session.playerTimer = setTimeout(() => { void startPlayer(session); }, remaining);
        }

        async function startPlayer(session) {
            if (!isCurrent(session) || !session.cover?.isConnected || session.playerEntry) return;
            session.playerTimer = 0;
            session.cover.setAttribute("data-player", "loading");
            session.playerLoadTimer = setTimeout(() => {
                if (isCurrent(session)) failPlayer(session);
            }, PLAYER_LOAD_TIMEOUT);
            watchLink(session);
            try {
                if (session.details.kind === "live") {
                    await startLivePlayer(session);
                    return;
                }
                const sdk = await ensureNano();
                if (!isCurrent(session) || !session.playerLoadTimer) return;
                const entry = createPlayerEntry(sdk, session.details, session.video.key);
                if (!isCurrent(session)) return;
                entry.owner = session;
                entry.lastUsed = Date.now();
                session.playerEntry = entry;
                entry.container.removeAttribute("data-ready");
                entry.container.style.opacity = "0";
                entry.container.slot = PLAYER_SLOT;
                scheduleCacheCleanup();
                queuePlayback(session, entry);
            } catch {
                if (isCurrent(session)) failPlayer(session);
            }
        }

        function watchLink(session) {
            if (session.linkObserver) return;
            // 仅监视当前候选链接的祖先根；等待、加载和显示阶段都随链接失效而取消预览。
            const observer = new MutationObserver(records => {
                if (records.some(record => record.type === "attributes" || record.removedNodes.length)) {
                    isCurrent(session);
                }
            });
            session.linkObserver = observer;
            const nativeAttributes = session.video.kind === "user" ? NATIVE_USER_ATTRIBUTES : [];
            const inDescription = session.anchor.matches(DESCRIPTION_LINK_SELECTOR);
            const anchorAttributes = inDescription ? ["href", "class", ...nativeAttributes] : ["href", ...nativeAttributes];
            observer.observe(session.anchor, { attributes: true, attributeFilter: anchorAttributes });
            const observedAncestors = new Set();
            if (inDescription) {
                // 只监视当前简介的祖先属性，避免在整个页面监听高频样式变化。
                let node = session.anchor.parentElement;
                while (node) {
                    observer.observe(node, { attributes: true, attributeFilter: ["id", "class", ...nativeAttributes] });
                    observedAncestors.add(node);
                    if (node.id === DESCRIPTION_ID) break;
                    node = node.parentElement;
                }
            }
            if (nativeAttributes.length) {
                // 原链接异步变成原生 @用户或被原生卡容器包裹时，立即撤掉自定义卡。
                for (let node = session.anchor.parentElement; node; node = node.parentElement) {
                    if (!observedAncestors.has(node)) {
                        observer.observe(node, { attributes: true, attributeFilter: nativeAttributes });
                    }
                }
            }
            let root = session.anchor.getRootNode();
            while (root) {
                observer.observe(root, { childList: true, subtree: true });
                root = root.host?.getRootNode();
            }
        }

        function revealPreview(session) {
            if (host.hidden) {
                const anchor = session.anchor.getBoundingClientRect();
                const width = Math.min(CARD_WIDTH, innerWidth - EDGE_GAP * 2);
                const left = Math.max(EDGE_GAP, Math.min(anchor.left, innerWidth - width - EDGE_GAP));
                const above = anchor.top - ANCHOR_GAP - EDGE_GAP;
                const below = innerHeight - anchor.bottom - ANCHOR_GAP - EDGE_GAP;
                // 加载时就选择空间较大的一侧，资料返回后保持贴近链接的边缘不变。
                const placeBelow = below >= above;
                host.style.left = `${left}px`;
                host.style.top = placeBelow ? `${anchor.bottom + ANCHOR_GAP}px` : "auto";
                host.style.bottom = placeBelow ? "auto" : `${innerHeight - anchor.top + ANCHOR_GAP}px`;
                host.style.setProperty("--bili-link-cards-hover-height", `${Math.max(0, placeBelow ? below : above)}px`);
                host.hidden = false;
            }
            host.style.removeProperty(COVER_HEIGHT_PROPERTY);
            const cover = panel.querySelector(".cover");
            if (!cover) return;
            const excess = panel.scrollHeight - panel.clientHeight;
            const coverHeight = cover.offsetHeight;
            if (excess > 0 && coverHeight > MIN_COVER_HEIGHT) {
                const height = Math.max(MIN_COVER_HEIGHT, coverHeight - excess - 1);
                host.style.setProperty(COVER_HEIGHT_PROPERTY, `${height}px`);
            }
        }

        function showStatus(message, session) {
            const status = document.createElement("div");
            status.className = "status";
            status.textContent = message;
            panel.replaceChildren(status);
            revealPreview(session);
        }

        function showUser(user, session) {
            panel.className = "bili-user-profile";
            panel.setAttribute("role", "dialog");
            panel.setAttribute("aria-label", `${user.name}的用户信息`);
            panel.replaceChildren(renderUser(user, true));
            revealPreview(session);
        }

        function showVideo(video, session) {
            if (video.kind === "user") {
                showUser(video, session);
                return;
            }
            const { cover, info } = renderMedia(video, PLAYER_SLOT);
            panel.replaceChildren(cover, info);
            revealPreview(session);
            schedulePlayer(session, cover, video);
        }

        function isCurrent(session) {
            if (active !== session) return false;
            if (!hoverEnabled() || document.hidden || session.route !== location.href ||
                !isSupportedPage() || !isLinkInScope(session.anchor) ||
                resourceFor(session.anchor)?.key !== session.video.key) {
                closePreview();
                return false;
            }
            return true;
        }

        function loadPreview(session) {
            hoverTimer = 0;
            if (!isCurrent(session)) return;
            updateTheme(host, session.anchor);
            const unsubscribe = subscribeResource(session.video, entry => {
                session.unsubscribe = null;
                if (!isCurrent(session)) return;
                if (entry.error) showStatus(entry.error, session);
                else showVideo(entry.data, session);
            }, true);
            if (active === session) {
                session.unsubscribe = unsubscribe;
                if (host.hidden) showStatus("正在加载预览信息…", session);
            } else unsubscribe?.();
        }

        function beginPreview(link) {
            cancelPreview();
            const session = { ...link, hoverStarted: Date.now(), route: location.href };
            active = session;
            watchLink(session);
            hoverTimer = setTimeout(() => loadPreview(session), HOVER_DELAY);
        }

        document.addEventListener("pointermove", event => {
            if (!hoverEnabled() || event.pointerType === "touch") return closePreview();
            if (active && active.route !== location.href) closePreview();
            if (active && event.composedPath().includes(host)) {
                if (!isCurrent(active)) return;
                clearTimeout(closeTimer);
                closeTimer = 0;
                return;
            }
            const link = findLink(event);
            if (link?.nativeUser) {
                closePreview();
                return;
            }
            if (active && link?.anchor === active.anchor && link.video.key === active.video.key) {
                clearTimeout(closeTimer);
                closeTimer = 0;
                return;
            }
            if (active && !host.hidden) {
                deferClose(link);
                return;
            }
            closePreview();
            if (link) beginPreview(link);
        }, { capture: true, passive: true });

        // pointerover/out 的 relatedTarget 会在 Shadow DOM 边界被重定向，
        // 同一组件内部的文字→链接移动可能到不了 document，故使用 composed pointermove。
        document.addEventListener("pointerout", event => {
            if (!event.relatedTarget) closePreview();
        }, { capture: true, passive: true });
        document.addEventListener("pointercancel", closePreview, { capture: true, passive: true });
        document.addEventListener("scroll", event => {
            if (event.composedPath().includes(host)) return;
            closePreview();
        }, { capture: true, passive: true });
        document.addEventListener("click", event => {
            if (event.composedPath().includes(host)) return;
            closePreview();
        }, true);
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) closePreview();
        });
        for (const type of ["blur", "resize", "popstate", "hashchange"]) {
            window.addEventListener(type, closePreview);
        }

        function dispose() {
            closePreview();
            for (const entry of players.values()) disposeEntry(entry);
            clearTimeout(playerCacheTimer);
            playerCacheTimer = 0;
        }

        return { close: closePreview, dispose, isOpen: () => !host.hidden };
    }

    const hover = createHoverCard();
    window.navigation?.addEventListener("currententrychange", refreshRoute);
    window.addEventListener("popstate", refreshRoute);
    window.addEventListener("hashchange", refreshRoute);
    window.addEventListener("blur", cancelPreview);
    document.addEventListener("scroll", cancelPreview, { capture: true, passive: true });
    document.addEventListener("pointercancel", cancelPreview, { capture: true, passive: true });
    document.addEventListener("pointerout", event => { if (!event.relatedTarget) cancelPreview(); }, { capture: true, passive: true });
    document.addEventListener("visibilitychange", () => { if (document.hidden) cancelPreview(); });
    document.addEventListener("pointerdown", event => {
        if (openSettings && !event.composedPath().includes(openSettings.control)) closeSettings();
    }, { capture: true, passive: true });
    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        if (openSettings) closeSettings(true);
        else {
            hover.close();
            cancelPreview();
        }
    }, true);
    themeQuery.addEventListener("change", () => {
        for (const record of records) updateTheme(record.host, record.anchor);
    });
    window.addEventListener("pagehide", () => {
        stopped = true;
        hover.dispose();
        stopInline();
        clearTimeout(pumpTimer); pumpTimer = 0;
        queue.length = 0; cache.clear();
    });
    window.addEventListener("pageshow", () => {
        if (!stopped) return;
        stopped = false;
        route = location.href;
        mode = readMode();
        syncPage();
    });
    for (const tag of COMPONENTS) {
        customElements.whenDefined(tag).then(() => {
            if (inlineEnabled() && isSupportedPage()) { pendingTrees.add(document); schedule(); }
        });
    }
    syncPage();
})();
