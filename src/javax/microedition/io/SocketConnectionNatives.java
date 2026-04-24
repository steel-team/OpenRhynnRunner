package javax.microedition.io;

public class SocketConnectionNatives {
    public static native void open(String host, int port);

    public static native void close(String host, int port);

    public static native int readBytes(String host, int port, byte[] buffer, int offset, int length);

    public static native int writeBytes(String host, int port, byte[] buffer, int offset, int length);

    public static native int available(String host, int port);
}
