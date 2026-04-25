const getTrueHeight = () => {
    const factor = computeScaleFactor();
    let baseSize = Math.round(window.innerHeight / factor);
    console.log(`scale factor = ${factor}, inner height = ${window.innerHeight}, resulting size = ${baseSize}`);
    return baseSize;
};

const computeScaleFactor = () => {
    let baseSize = window.innerHeight;
    let targetHeight = 320;
    return baseSize / targetHeight;
};

export default {
    async Java_javax_microedition_lcdui_UiNatives_requestInput(lib) {
        let input = prompt('Enter text', '');
        return input;
    },
    async Java_com_steelteam_EmuNatives_getWidth(lib, baseWidth) {
        let baseSize = Math.round(window.innerWidth / computeScaleFactor());

        const coef = 0.8; //0.75, 240x320 as a base + offset
        let height = getTrueHeight();
        const bound = height * coef;

        return Math.min(baseSize, bound);
    },
    async Java_com_steelteam_EmuNatives_getHeight(lib, baseHeight) {

        return getTrueHeight();
    }
}