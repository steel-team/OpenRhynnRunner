let activeSockets = new Map();
let currentConnection = null;

export default {
    async Java_javax_microedition_io_SocketConnectionNatives_open(lib, host, port) {
        if(host.startsWith("-")) return;
        const uri = `ws://${host}:8181/ws`;
        return new Promise((resolve, reject) => {
            try {
                const ws = new WebSocket(uri);
                
                ws.onopen = () => {
                    console.log(`Connected to ${host}:${port}`);
                    currentConnection = ws;
                    activeSockets.set(`${host}:${port}`, ws);
                    resolve();
                };
                
                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(new Error(`Connection failed: ${error.message}`));
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
            return -1;
        }
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Read timeout'));
            }, 30000);
            
            const handleMessage = (event) => {
                socket.removeEventListener('message', handleMessage);
                clearTimeout(timeout);
                
                const data = event.data;
                let bytesToCopy;
                
                if (data instanceof ArrayBuffer) {
                    bytesToCopy = new Uint8Array(data);
                } else if (data instanceof Blob) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        bytesToCopy = new Uint8Array(reader.result);
                        copyToJavaBuffer(bytesToCopy, buffer, offset, length, resolve);
                    };
                    reader.onerror = () => reject(new Error('Failed to read blob'));
                    reader.readAsArrayBuffer(data);
                    return;
                } else {
                    const encoder = new TextEncoder();
                    bytesToCopy = encoder.encode(data);
                }
                
                copyToJavaBuffer(bytesToCopy, buffer, offset, length, resolve);
            };
            
            socket.addEventListener('message', handleMessage);
            
            if (socket.readBuffer && socket.readBuffer.length > 0) {
                socket.removeEventListener('message', handleMessage);
                clearTimeout(timeout);
                const bufferedData = socket.readBuffer.shift();
                copyToJavaBuffer(bufferedData, buffer, offset, length, resolve);
            }
        });
    },
    
    async Java_javax_microedition_io_SocketConnectionNatives_writeBytes(lib, host, port, buffer, offset, length) {
        const key = `${host}:${port}`;
        const socket = activeSockets.get(key);

        if (!socket || socket.readyState !== WebSocket.OPEN) {
            throw new Error('Connection not open');
        }
        
        const javaBytes = new Uint8Array(buffer);
        const bytesToSend = javaBytes.slice(offset, offset + length);
        
        socket.send(bytesToSend.buffer);
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

function copyToJavaBuffer(sourceBytes, javaBuffer, offset, length, resolve) {
    const bytesToCopy = Math.min(sourceBytes.length, length);
    
    for (let i = 0; i < bytesToCopy; i++) {
        javaBuffer[offset + i] = sourceBytes[i];
    }
    
    resolve(bytesToCopy);
}