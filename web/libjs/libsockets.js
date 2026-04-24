export default {
    async Java_javax_microedition_io_SocketConnectionNatives_open(lib, host, port) {
        console.log(`Requested socket connection ${host}:${port}`);
    },
    async Java_javax_microedition_io_SocketConnectionNatives_close(lib, host, port) {
        console.log(`Requested conn close ${host}:${port}`);
    }
}