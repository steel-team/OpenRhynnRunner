package javax.microedition.io;

public class SocketConnectionNatives {
    public static native void open(String host, int port);

    public static native void close(String host, int port);
}
