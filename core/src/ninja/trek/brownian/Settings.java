package ninja.trek.brownian;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.scenes.scene2d.Actor;
import com.badlogic.gdx.scenes.scene2d.InputEvent;
import com.badlogic.gdx.scenes.scene2d.ui.CheckBox;
import com.badlogic.gdx.scenes.scene2d.ui.Label;
import com.badlogic.gdx.scenes.scene2d.ui.Skin;
import com.badlogic.gdx.scenes.scene2d.ui.Slider;
import com.badlogic.gdx.scenes.scene2d.ui.Table;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.scenes.scene2d.ui.TextField;
import com.badlogic.gdx.scenes.scene2d.utils.ChangeListener;
import com.badlogic.gdx.scenes.scene2d.utils.ClickListener;
import com.kotcrab.vis.ui.VisUI;


public class Settings extends Table {
    public Settings(final BrownianTreeGen parent){
        Skin skin = VisUI.getSkin();
//        final CheckBox outside = new CheckBox("outside", skin);
//        add(outside).row();
        final Slider angle = new Slider(1, 180, 1, false, skin);
        final CheckBox nearest = new CheckBox("Go Towards Nearest", skin);
        nearest.addListener(new ChangeListener() {
            @Override
            public void changed(ChangeEvent event, Actor actor) {
                angle.setDisabled(!((CheckBox)actor).isChecked());
            }
        });
        add(nearest).colspan(2).left().row();

        final CheckBox rand = new CheckBox("Random Start Point", skin);
        add(rand).left().row();



        final Slider lineCount = new Slider(1, 10000, 1, false, skin);

        final Label linesL = new Label("lines", skin);
        lineCount.addListener(new ChangeListener() {
            @Override
            public void changed(ChangeEvent event, Actor actor) {
                String formatted = String.format("% 4d", (int)lineCount.getValue());
                linesL.setText("Lines " + formatted);
            }
        });
        lineCount.setValue(1000);
        add(linesL).left();
        add(lineCount).left().row();

        final Label angleL = new Label("angle", skin);
        angle.addListener(new ChangeListener() {
            @Override
            public void changed(ChangeEvent event, Actor actor) {
                String formatted = String.format("% 3d", (int)angle.getValue());
                angleL.setText("Angle " + formatted);
            }
        });
        angle.setDisabled(true);
        add(angleL).left();
        add(angle).left().row();

        final Label childL = new Label("Child Limit: ", skin);
        final TextField childLimit = new TextField("1000", skin);
        childLimit.setTextFieldFilter(new TextField.TextFieldFilter() {
            @Override
            public boolean acceptChar(TextField textField, char c) {
                for (int i = 0; i < 10; i++)
                    if (c == ((char)i + '0')) return true;
                return false;
            }
        });
        childLimit.addListener(new ChangeListener() {
            @Override
            public void changed(ChangeEvent event, Actor actor) {
                //String text = ((TextField) actor).getText();
                //Gdx.app.log("settings", "tect " + text);
            }
        });
        add(childL).left();
        add(childLimit).left().row();

        final Label lineMinL = new Label("Line Min 15", skin);
        final Slider lineMin = new Slider(1, 50, 1, false, skin);
        lineMin.addListener(new ChangeListener() {
            @Override
            public void changed(ChangeEvent event, Actor actor) {
                lineMinL.setText("Line Min " + (int)lineMin.getValue());
            }
        });
        lineMin.setValue(15);
        final Label lineMaxL = new Label("Line Max", skin);
        final Slider lineMax = new Slider(1, 50, 1, false, skin);
        lineMax.addListener(new ChangeListener() {
            @Override
            public void changed(ChangeEvent event, Actor actor) {
                lineMaxL.setText("Line Max " + (int)lineMax.getValue());
            }
        });
        lineMax.setValue(30);

        add(lineMinL);
        add(lineMin).left().row();
        add(lineMaxL);
        add(lineMax).left().row();




        TextButton go = new TextButton(" Go ", skin);
        go.addListener(new ClickListener(){
            @Override
            public void clicked(InputEvent event, float x, float y) {
                super.clicked(event, x, y);
                parent.createTree( nearest.isChecked(), (int)lineCount.getValue(), angle.getValue(), Integer.parseInt(childLimit.getText()), rand.isChecked(), lineMin.getValue(), lineMax.getValue());
            }
        });
        add(go);
    }
}
