package ninja.trek.brownian;

import com.badlogic.gdx.scenes.scene2d.Actor;
import com.badlogic.gdx.scenes.scene2d.InputEvent;
import com.badlogic.gdx.scenes.scene2d.ui.CheckBox;
import com.badlogic.gdx.scenes.scene2d.ui.Label;
import com.badlogic.gdx.scenes.scene2d.ui.Skin;
import com.badlogic.gdx.scenes.scene2d.ui.Slider;
import com.badlogic.gdx.scenes.scene2d.ui.Table;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.scenes.scene2d.utils.ChangeListener;
import com.badlogic.gdx.scenes.scene2d.utils.ClickListener;
import com.kotcrab.vis.ui.VisUI;

public class Settings extends Table {
    public Settings(final BrownianTreeGen parent){
        Skin skin = VisUI.getSkin();
        final CheckBox outside = new CheckBox("outside", skin);
        add(outside).row();
        final CheckBox nearest = new CheckBox("go towards nearest", skin);
        add(nearest).row();
        final Slider lineCount = new Slider(1, 10000, 1, false, skin);
        final Label linesL = new Label("lines", skin);
        lineCount.addListener(new ChangeListener() {
            @Override
            public void changed(ChangeEvent event, Actor actor) {
                String formatted = String.format("% 4d", (int)lineCount.getValue());
                linesL.setText("Lines " + formatted);
            }
        });
        add(linesL);
        add(lineCount).row();
        final Slider angle = new Slider(1, 360, 1, false, skin);
        final Label angleL = new Label("angle", skin);
        angle.addListener(new ChangeListener() {
            @Override
            public void changed(ChangeEvent event, Actor actor) {
                String formatted = String.format("% 3d", (int)angle.getValue());
                angleL.setText("Angle " + formatted);
            }
        });
        add(angleL);
        add(angle).row();

        TextButton go = new TextButton("Go", skin);
        go.addListener(new ClickListener(){
            @Override
            public void clicked(InputEvent event, float x, float y) {
                super.clicked(event, x, y);
                parent.createTree(outside.isChecked(), nearest.isChecked(), (int)lineCount.getValue(), angle.getValue());
            }
        });
        add(go);
    }
}
