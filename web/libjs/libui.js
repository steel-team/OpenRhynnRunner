export default {
    async Java_javax_microedition_lcdui_UiNatives_requestInput() {
        let input = prompt('Enter text', '');
        return input;
    },
    async Java_com_steelteam_EmuNatives_getWidth(baseWidth) {

        return 800;
    },
    async Java_com_steelteam_EmuNatives_getHeight(baseHeight) {

        return 600;
    }
}