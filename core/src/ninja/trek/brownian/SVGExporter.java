package ninja.trek.brownian;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.files.FileHandle;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.utils.Array;

import java.io.FileWriter;
import java.io.IOException;
import java.io.Writer;
import java.util.List;

public class SVGExporter {
    public static void exportToSVG(Array<Vector2> startPoints, Array<Vector2> endPoints, FileHandle file) {

        Writer writer =  file.writer(false);
        Gdx.app.log("exporter", " file: " + file.path());
        // SVG Header
        try {
            writer.write("<?xml version=\"1.0\" standalone=\"no\"?>\n");
            writer.write("<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n");
            writer.write("<svg width=\"800\" height=\"600\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\">\n");
            // Build Path Data
            StringBuilder pathData = new StringBuilder();
            for (int i = 0; i < startPoints.size; i++) {
                Vector2 start = startPoints.get(i);
                Vector2 end = endPoints.get(i);
                Gdx.app.log("exporter", " append: " +start.x + start.y + end.x + end.y);
                pathData.append(String.format("M%f,%fL%f,%f ", start.x, start.y, end.x, end.y));
            }

            // Single Path Element
            writer.write(String.format("<path d=\"%s\" stroke=\"black\" fill=\"none\" />\n", pathData.toString()));

            // SVG Footer
            writer.write("</svg>\n");
            writer.close();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }


    }

    // ... (Point class remains the same)
}
