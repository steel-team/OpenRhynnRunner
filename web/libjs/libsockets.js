export default {
    async Java_javax_microedition_io_SocketConnectionNatives_open(lib, host, port) {
        if(host.startsWith("-")) return;
        const ident = `${host}:${port}`;
        const uri = `ws://${host}:8181/ws`;
        console.log(`Requested socket connection ${host}:${port}, converted to: ${uri}`);
        if(window.sockets == undefined) {
            window.sockets = {};
        }
        
        window.sockets[ident] = new WebSocket(uri);
        await new Promise((resolve, reject) => {
            window.sockets[ident].addEventListener("open", () => {
                console.log("Socket connected!");
                resolve();
            });

            window.sockets[ident].addEventListener("close", () => {
                console.log("Socket disconnected!");
            });

            window.sockets[ident].addEventListener("message", (e) => {
                log(`RECEIVED: ${e.data}`);
            });

            window.sockets[ident].addEventListener("error", (e) => {
                console.error(e);
                reject(error);
            });
        });
    },
    async Java_javax_microedition_io_SocketConnectionNatives_close(lib, host, port) {
        console.log(`Requested conn close ${host}:${port}`);
        const ident = `${host}:${port}`;

        if(window.sockets[ident] == undefined) return;
        window.sockets[ident].close();
        window.sockets[ident] = undefined;
    }
}