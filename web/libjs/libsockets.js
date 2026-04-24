let activeSockets = new Map();
let socketQueues = new Map();
let currentConnection = null;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default {
    async Java_javax_microedition_io_SocketConnectionNatives_open(lib, host, port) {
        if(host.startsWith("-")) return -1;
        if(host.startsWith("true")) return -1;
        //const uri = `ws://${host}:8181/ws`;
        const uri = "ws://server2.openrhynn.net:8181/ws"; // force specific server due to OR client bug.
        const socketKey = `${host}:${port}`;
        try {
         await new Promise((resolve, reject) => {
            try {
                const ws = new WebSocket(uri);

                const dataQueue = new DataQueue();
                socketQueues.set(socketKey, dataQueue);

                ws.binaryType = 'arraybuffer';
                
                ws.onopen = () => {
                    console.log(`Connected to ${host}:${port}`);
                    currentConnection = ws;
                    activeSockets.set(socketKey, ws);
                    resolve();
                };

                ws.onmessage = (event) => {
                    let data;
                    if (event.data instanceof ArrayBuffer) {
                        data = new Uint8Array(event.data);
                    } else if (event.data instanceof Blob) {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const buffer = reader.result;
                            const queue = socketQueues.get(socketKey);
                            if (queue) {
                                queue.enqueue(new Uint8Array(buffer));
                            }
                        };
                        reader.readAsArrayBuffer(event.data);
                        return;
                    } else if (typeof event.data === 'string') {
                        const encoder = new TextEncoder();
                        data = encoder.encode(event.data);
                    } else {
                        console.warn('Unknown message type:', typeof event.data);
                        return;
                    }
                    
                    const queue = socketQueues.get(socketKey);
                    if (queue) {
                        queue.enqueue(data);
                    }
                };
                
                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    //reject(new Error(`Connection failed: ${error.message}`));
                    resolve();
                };
                
                ws.onclose = () => {
                    console.log(`Disconnected from ${host}:${port}`);
                    if (currentConnection === ws) {
                        currentConnection = null;
                    }
                    activeSockets.delete(`${host}:${port}`);
                };
                
                ws.readBuffer = [];
                ws.isReading = false;
                
            } catch (error) {
                reject(error);
            }
        });
        return 0;
    }catch(e) {
        console.error(e);
        return -1;
    }
    },
    
    async Java_javax_microedition_io_SocketConnectionNatives_close(lib, host, port) {
        const key = `${host}:${port}`;
        const socket = activeSockets.get(key);
        
        if (socket) {
            if (socket.readyState === WebSocket.OPEN || 
                socket.readyState === WebSocket.CONNECTING) {
                socket.close();
            }
            activeSockets.delete(key);
        }
        
        if (currentConnection === socket) {
            currentConnection = null;
        }
    },
    
    async Java_javax_microedition_io_SocketConnectionNatives_readBytes(lib, host, port, buffer, offset, length) {
        const key = `${host}:${port}`;
        const socket = activeSockets.get(key);

        if (!socket || socket.readyState !== WebSocket.OPEN) {
            return 0;
        }
        
        const queue = socketQueues.get(key);
        if (!queue) {
            return -1;
        }

        console.log(`read c1, from ${offset} to ${length}`);
        
        try {
            await queue.waitForData(1);
            
            const data = queue.dequeue(length);       
            console.log("pre c2");
            console.log(data);    
            
            if (!data || data.length === 0) {
                return -1;
            }
            
            console.log(`read c2, req len = ${length}, cur len: ${data.length}`)             
            const bytesToCopy = Math.min(data.length, length);
            console.log(bytesToCopy);
            for (let i = 0; i < bytesToCopy; i++) {
                buffer[offset + i] = data[i];
            }
            
            return bytesToCopy;
            
        } catch (error) {
            console.error('Read error:', error);
            return -1;
        }
    },
    
    async Java_javax_microedition_io_SocketConnectionNatives_writeBytes(lib, host, port, buffer, offset, length) {
        const key = `${host}:${port}`;
        const socket = activeSockets.get(key);

        if (!socket || socket.readyState !== WebSocket.OPEN) {
            return -1;
        }
        
        const javaBytes = new Uint8Array(buffer);
        const bytesToSend = javaBytes.slice(offset, offset + length);
        
        socket.send(bytesToSend.buffer);
        return 0;
    },
    
    async Java_javax_microedition_io_SocketConnectionNatives_available(lib, host, port) {
        const key = `${host}:${port}`;
        const socket = activeSockets.get(key);

        if (!socket || socket.readyState !== WebSocket.OPEN) {
            return 0;
        }
        
        return socket.readBuffer ? 
            socket.readBuffer.reduce((sum, buf) => sum + buf.length, 0) : 0;
    }
};

class DataQueue {
    constructor() {
        this.queue = [];
        this.totalSize = 0;
        this.waitingResolvers = [];
    }
    
    enqueue(data) {
        if (data && data.length > 0) {
            this.queue.push(data);
            this.totalSize += data.length;            
        }
    }
    
    dequeue(length) {
        if (this.queue.length === 0) {
            return null;
        }
        
        let bytesRead = 0;
        const result = new Uint8Array(length);
        
        while (bytesRead < length && this.queue.length > 0) {
            const frontChunk = this.queue[0];
            const remainingNeeded = length - bytesRead;
            
            if (frontChunk.length <= remainingNeeded) {
                result.set(frontChunk, bytesRead);
                bytesRead += frontChunk.length;
                this.queue.shift();
            } else {
                const partialChunk = frontChunk.slice(0, remainingNeeded);
                result.set(partialChunk, bytesRead);
                bytesRead += remainingNeeded;
                
                this.queue[0] = frontChunk.slice(remainingNeeded);
            }
        }
        
        this.totalSize -= bytesRead;
        
        return bytesRead === length ? result : result.slice(0, bytesRead);
    }
    
    peek(length) {
        if (this.queue.length === 0) {
            return null;
        }
        
        if (length === undefined) {
            return this.totalSize;
        }
        
        let bytesRead = 0;
        const result = new Uint8Array(Math.min(length, this.totalSize));
        
        for (const chunk of this.queue) {
            const chunkToCopy = Math.min(chunk.length, length - bytesRead);
            result.set(chunk.slice(0, chunkToCopy), bytesRead);
            bytesRead += chunkToCopy;
            if (bytesRead >= length) break;
        }
        
        return result;
    }
    
    hasData(length = 1) {
        return this.totalSize >= length;
    }
    
    async waitForData(length = 1) {
        if (this.hasData(length)) {
            return true;
        }

        /*let trier = 0;
        for(let i = 0; i < 300; i++) {

        }*/
       while(true) {
        console.log(this.totalSize);
        if (this.hasData(length)) {
            return true;
        }
        await sleep(16);
       }
    }
    
    size() {
        return this.totalSize;
    }
    
    clear() {
        this.queue = [];
        this.totalSize = 0;
        this.waitingResolvers = [];
    }
}