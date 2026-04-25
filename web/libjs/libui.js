const getTrueHeight = () => {
    let dpr = window.devicePixelRatio;
    let baseSize = window.outerHeight;
    if(dpr == 1) {
        baseSize = window.outerHeight / 2;
    }

    return baseSize;
};

export default {
    async Java_javax_microedition_lcdui_UiNatives_requestInput(lib) {
        let input = prompt('Enter text', '');
        return input;
    },
    async Java_com_steelteam_EmuNatives_getWidth(lib, baseWidth) {
        let dpr = window.devicePixelRatio;
        let baseSize = window.outerWidth;
        
        if(dpr == 1) {
            baseSize = window.outerWidth / 2;
        }

        const coef = 0.8; //0.75, 240x320 as a base + offset
        let height = getTrueHeight();
        const bound = height * coef;

        return Math.min(baseSize, bound);
    },
    async Java_com_steelteam_EmuNatives_getHeight(lib, baseHeight) {

        return getTrueHeight();
    }
}