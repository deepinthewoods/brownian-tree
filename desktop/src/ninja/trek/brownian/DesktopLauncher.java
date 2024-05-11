package ninja.trek.brownian;

import com.badlogic.gdx.backends.lwjgl3.Lwjgl3Application;
import com.badlogic.gdx.backends.lwjgl3.Lwjgl3ApplicationConfiguration;
import ninja.trek.brownian.BrownianTreeGen;

// Please note that on macOS your application needs to be started with the -XstartOnFirstThread JVM argument
public class DesktopLauncher {
	public static void main (String[] arg) {
		Lwjgl3ApplicationConfiguration config = new Lwjgl3ApplicationConfiguration();
		config.setForegroundFPS(60);
		config.setTitle("Brownian Tree Generator");
		config.setWindowedMode(1024, 1024);
		new Lwjgl3Application(new BrownianTreeGen(), config);
	}
}
