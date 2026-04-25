export default {
    async Java_javax_microedition_lcdui_UiNatives_requestInput() {
        let input = prompt('Enter text', '');
        return input;
    }
}