/*
	This file is part of FreeJ2ME.

	FreeJ2ME is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	FreeJ2ME is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with FreeJ2ME.  If not, see http://www.gnu.org/licenses/
*/
package javax.microedition.io;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;

public class SocketConnectionImpl implements SocketConnection {

    // protected Socket socket;
    private String _host;
    private int _port;
    public static HashMap<String, SocketConnectionImpl> connMap = new HashMap<String, SocketConnectionImpl>();
    private boolean _failure = false;

    public SocketConnectionImpl() {
    }

    public SocketConnectionImpl(String host, int port) throws IOException {
        _host = host;
        _port = port;
        connMap.put(host + ":" + port, this);
        System.out.println("conn : " + host + ":" + port);
        try {
            int res = SocketConnectionNatives.open(host, port);
            _failure = res == -1;
        } catch (Exception ex) {
            throw new IOException();
        }
    }

    public String getAddress() throws IOException {
        /*
         * if (socket == null || socket.isClosed()) {
         * throw new IOException();
         * }
         */

        return "127.0.0.1";// socket.getInetAddress().toString();
    }

    public String getLocalAddress() throws IOException {
        /*
         * if (socket == null || socket.isClosed()) {
         * throw new IOException();
         * }
         * 
         * return socket.getLocalAddress().toString();
         */
        return "127.0.0.1";
    }

    public int getLocalPort() throws IOException {
        /*
         * if (socket == null || socket.isClosed()) {
         * throw new IOException();
         * }
         * 
         * return socket.getLocalPort();
         */
        return 1;
    }

    public int getPort() throws IOException {
        /*
         * if (socket == null || socket.isClosed()) {
         * throw new IOException();
         * }
         * 
         * return socket.getPort();
         */
        return _port;
    }

    public int getSocketOption(byte option) throws IllegalArgumentException,
            IOException {
        /*
         * if (socket != null && socket.isClosed()) {
         * throw new IOException();
         * }
         * switch (option) {
         * case DELAY:
         * if (socket.getTcpNoDelay()) {
         * return 1;
         * } else {
         * return 0;
         * }
         * case LINGER:
         * int value = socket.getSoLinger();
         * if (value == -1) {
         * return 0;
         * } else {
         * return value;
         * }
         * case KEEPALIVE:
         * if (socket.getKeepAlive()) {
         * return 1;
         * } else {
         * return 0;
         * }
         * case RCVBUF:
         * return socket.getReceiveBufferSize();
         * case SNDBUF:
         * return socket.getSendBufferSize();
         * default:
         * throw new IllegalArgumentException();
         * }
         */
        return 0;
    }

    public void setSocketOption(byte option, int value)
            throws IllegalArgumentException, IOException {
        /*
         * if (socket.isClosed()) {
         * throw new IOException();
         * }
         * switch (option) {
         * case DELAY:
         * int delay;
         * if (value == 0) {
         * delay = 0;
         * } else {
         * delay = 1;
         * }
         * socket.setTcpNoDelay(delay == 0 ? false : true);
         * break;
         * case LINGER:
         * if (value < 0) {
         * throw new IllegalArgumentException();
         * }
         * socket.setSoLinger(value == 0 ? false : true, value);
         * break;
         * case KEEPALIVE:
         * int keepalive;
         * if (value == 0) {
         * keepalive = 0;
         * } else {
         * keepalive = 1;
         * }
         * socket.setKeepAlive(keepalive == 0 ? false : true);
         * break;
         * case RCVBUF:
         * if (value <= 0) {
         * throw new IllegalArgumentException();
         * }
         * socket.setReceiveBufferSize(value);
         * break;
         * case SNDBUF:
         * if (value <= 0) {
         * throw new IllegalArgumentException();
         * }
         * socket.setSendBufferSize(value);
         * break;
         * default:
         * throw new IllegalArgumentException();
         * }
         */
    }

    public void close() throws IOException {
        SocketConnectionNatives.close(_host, _port);
        if (connMap.containsKey(_host + ":" + _port)) {
            connMap.remove(_host + ":" + _port);
        }
    }

    public InputStream openInputStream() throws IOException {
        return new NetworkInputStream(_host, _port);
    }

    public OutputStream openOutputStream() throws IOException {
        return new NetworkOutputStream(_host, _port);
    }

    public DataInputStream openDataInputStream() throws IOException {
        if (_failure)
            return null;
        return new DataInputStream(new NetworkInputStream(_host, _port));
    }

    public DataOutputStream openDataOutputStream() throws IOException {
        if (_failure)
            return null;
        return new DataOutputStream(new NetworkOutputStream(_host, _port));
    }

    // custom streams
    private static class NetworkInputStream extends InputStream {

        private String _host;
        private int _port;

        public NetworkInputStream(String host, int port) {
            _host = host;
            _port = port;
        }

        @Override
        public int read() throws IOException {
            byte[] buf = new byte[1];
            int result = SocketConnectionNatives.readBytes(_host, _port, buf, 0, 1);
            System.out.println("read-java-1");
            System.out.println("read: " + buf[0]);
            if (result <= 0) {
                return -1;
            }
            return buf[0] & 0xFF;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            if (b == null) {
                throw new NullPointerException();
            }
            if (off < 0 || len < 0 || len > b.length - off) {
                throw new IndexOutOfBoundsException();
            }
            if (len == 0) {
                return 0;
            }
            System.out.println("read-java-pre = " + len + " offs = " + off);
            int res = SocketConnectionNatives.readBytes(_host, _port, b, off, len);
            System.out.println("read-java-2");
            System.out.println("read: " + b[0]);
            return res;
        }

        @Override
        public int available() throws IOException {
            return SocketConnectionNatives.available(_host, _port);
        }

        @Override
        public void close() throws IOException {
            // Connection close handled separately
        }
    }

    // Custom OutputStream implementation
    private static class NetworkOutputStream extends OutputStream {
        private String _host;
        private int _port;

        public NetworkOutputStream(String host, int port) {
            _host = host;
            _port = port;
        }

        @Override
        public void write(int b) throws IOException {
            byte[] buf = new byte[] { (byte) (b & 0xFF) };
            int res = SocketConnectionNatives.writeBytes(_host, _port, buf, 0, 1);
            if (res == -1)
                throw new IOException();
        }

        @Override
        public void write(byte[] b, int off, int len) throws IOException {
            if (b == null) {
                throw new NullPointerException();
            }
            if (off < 0 || len < 0 || len > b.length - off) {
                throw new IndexOutOfBoundsException();
            }
            if (len == 0) {
                return;
            }

            int res = SocketConnectionNatives.writeBytes(_host, _port, b, off, len);
            if (res == -1)
                throw new IOException();
        }

        @Override
        public void flush() throws IOException {
            // No buffering in this implementation
        }

        @Override
        public void close() throws IOException {
            // Connection close handled separately
        }
    }

}
