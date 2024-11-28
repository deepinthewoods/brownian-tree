package ninja.trek.brownian;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.math.Intersector;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.scenes.scene2d.InputEvent;
import com.badlogic.gdx.scenes.scene2d.InputListener;
import com.badlogic.gdx.scenes.scene2d.Touchable;
import com.badlogic.gdx.scenes.scene2d.ui.ButtonGroup;
import com.badlogic.gdx.scenes.scene2d.ui.CheckBox;
import com.badlogic.gdx.scenes.scene2d.ui.Label;
import com.badlogic.gdx.scenes.scene2d.ui.Skin;
import com.badlogic.gdx.scenes.scene2d.ui.Stack;
import com.badlogic.gdx.scenes.scene2d.ui.Table;
import com.badlogic.gdx.scenes.scene2d.Actor;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.scenes.scene2d.ui.Widget;
import com.badlogic.gdx.scenes.scene2d.ui.WidgetGroup;
import com.badlogic.gdx.scenes.scene2d.utils.ChangeListener;
import com.badlogic.gdx.scenes.scene2d.utils.ClickListener;
import com.badlogic.gdx.utils.Array;
import com.kotcrab.vis.ui.VisUI;

import java.awt.Font;

public class DrawingScreen extends Stack {
    public static String TAG = "Drawing Screen";
    public Array<Vector2> sourceStart = new Array<Vector2>(), sourceEnd = new Array<Vector2>();
    public Array<Vector2> adjustedSourceStart = new Array<Vector2>(), adjustedSourceEnd = new Array<Vector2>();
    public Array<Vector2> excludeStart = new Array<Vector2>(), excludeEnd = new Array<Vector2>();

    public Array<Vector2> destStart = new Array<Vector2>(), destEnd = new Array<Vector2>();

    public boolean isFirstPoint = false;
    public boolean[] shouldStopGenerating;
    public int shouldStopTotal;

    public enum DrawingMode {SOURCE, DESTINATION, EXCLUDE, ERASE};
    private DrawingMode mode = DrawingMode.SOURCE;

    public Vector2 current = new Vector2();

    public DrawingScreen(final BrownianTreeGen parent){
        Skin skin = VisUI.getSkin();
        skin.getFont("default-font").getData().markupEnabled = true;
        Table backTable = new Table();
        TextButton clear = new TextButton("clear", skin);
//        Gdx.app.log(TAG, "font " + skin.getFont("label"));
        clear.addListener(new ClickListener(){
            @Override
            public void clicked(InputEvent event, float x, float y) {
                sourceStart.clear();
                sourceEnd.clear();
                adjustedSourceStart.clear();
                adjustedSourceEnd.clear();
                destStart.clear();
                destEnd.clear();
            }
        });
        backTable.add(clear).top();

        ButtonGroup drawGroup = new ButtonGroup<CheckBox>();
        Table drawTable = new Table();

        CheckBox sourceBtn = new CheckBox("[CYAN]Source", skin);

        drawGroup.add(sourceBtn);
        drawTable.add(sourceBtn).row();
        sourceBtn.addListener(new ChangeListener(){
            @Override
            public void changed(ChangeEvent event, Actor actor) {
                if (((CheckBox)actor).isChecked())
                    mode = DrawingMode.SOURCE;
            }
        });

        CheckBox destBtn = new CheckBox("[GREEN]Destination", skin);
        drawGroup.add(destBtn);
        drawTable.add(destBtn).row();
        destBtn.addListener(new ChangeListener(){
            @Override
            public void changed(ChangeEvent event, Actor actor) {
                if (((CheckBox)actor).isChecked())
                    mode = DrawingMode.DESTINATION;
            }
        });

        CheckBox eraseBtn = new CheckBox("Eraser",  skin);
        drawGroup.add(eraseBtn);
        drawTable.add(eraseBtn).row();
        eraseBtn.addListener(new ChangeListener(){
            @Override
            public void changed(ChangeEvent event, Actor actor) {
                if (((CheckBox)actor).isChecked())
                    mode = DrawingMode.ERASE;
            }
        });

        CheckBox excludeBtn = new CheckBox("[RED]Exclude",  skin);
        drawGroup.add(excludeBtn);
        drawTable.add(excludeBtn).row();
        excludeBtn.addListener(new ChangeListener(){
            @Override
            public void changed(ChangeEvent event, Actor actor) {
                if (((CheckBox)actor).isChecked())
                    mode = DrawingMode.EXCLUDE;
            }
        });

        backTable.add(drawTable).top();
        TextButton back = new TextButton("back", skin);
        back.addListener(new ClickListener(){
            @Override
            public void clicked(InputEvent event, float x, float y) {
                makeAdjustedSourceLines();
                parent.mainScreen();
            }
        });
        backTable.add(back).top();
        backTable.add(new Actor()).expand();



        Actor actor = new Actor();
        actor.setBounds(0,0,Gdx.graphics.getWidth(), Gdx.graphics.getHeight());
//        Label actor = new Label("d", skin);
//        Widget actor = new Widget();
        actor.addListener(new InputListener(){
            @Override
            public boolean touchDown(InputEvent event, float x, float y, int pointer, int button) {
                Gdx.app.log("draw", "touch " + x + " " + y + mode);
                if (mode == DrawingMode.ERASE){
                    erase(x, y);
                    return true;
                }
                isFirstPoint = !isFirstPoint;
                Array<Vector2> start = null, end = null, center = null;

                if (mode == DrawingMode.SOURCE) {
                    start = sourceStart;
                    end = sourceEnd;
                } else if (mode == DrawingMode.DESTINATION){
                    start = destStart;
                    end = destEnd;
                } else if (mode == DrawingMode.EXCLUDE){
                    start = excludeStart;
                    end = excludeEnd;
                }

                if (isFirstPoint) {
                    current.set(x, y);
                }
                else{
                    start.add(new Vector2(current));
                    end.add(new Vector2(x, y));
                    if (center != null){
                        Vector2 c = new Vector2(current);
                        c.lerp(end.peek(), .5f);
                        center.add(c);
                    }
                }
                return true;
            }
        });

        actor.setTouchable(Touchable.enabled);
        setTouchable(Touchable.enabled);

        add(actor);//.expand();
        add(backTable);
        setFillParent(true);
    }
    Vector2 a = new Vector2();
    private void erase(float x, float y) {
        Gdx.app.log("draws", "erase");
        float dist = Float.MAX_VALUE;
        int closestIndex = -1;
        Array<?> closestListE = null, closestListS = null;
        a.set(x, y);
        for (int i = 0; i < sourceStart.size; i++){
            Vector2 s = sourceStart.get(i);
            Vector2 e = sourceEnd.get(i);
//			if (a.dst2(centre.get(i)) < dist){
            float d = Intersector.distanceSegmentPoint(s, e, a);
            if (d < dist){
                dist = d;
                closestIndex = i;
                closestListS = sourceStart;
                closestListE = sourceEnd;
            }
        }

        for (int i = 0; i < destStart.size; i++){
            Vector2 s = destStart.get(i);
            Vector2 e = destEnd.get(i);
//			if (a.dst2(centre.get(i)) < dist){
            float d = Intersector.distanceSegmentPoint(s, e, a);
            if (d < dist){
                dist = d;
                closestIndex = i;
                closestListS = destStart;
                closestListE = destEnd;
            }
        }

        for (int i = 0; i < excludeStart.size; i++){
            Vector2 s = excludeStart.get(i);
            Vector2 e = excludeEnd.get(i);
//			if (a.dst2(centre.get(i)) < dist){
            float d = Intersector.distanceSegmentPoint(s, e, a);
            if (d < dist){
                dist = d;
                closestIndex = i;
                closestListS = excludeStart;
                closestListE = excludeEnd;
            }
        }

        if (closestIndex != -1){
            closestListS.removeIndex(closestIndex);
            closestListE.removeIndex(closestIndex);
            Gdx.app.log("draws", "erased");
        }
        makeAdjustedSourceLines();
    }

    public void makeAdjustedSourceLines() {
        adjustedSourceStart.clear();
        adjustedSourceEnd.clear();
        //find smallest length
        int smallestIndex = 0;
        float smallestLen2 = 1000000000;
        for (int i = 0; i < sourceStart.size; i++){
            float len2 = sourceStart.get(i).dst2(sourceEnd.get(i));
            if (len2 < smallestLen2){
                smallestLen2 = len2;
                smallestIndex = i;
            }
        }
        float targetLen = (float)Math.sqrt(smallestLen2)/3f;
        for (int i = 0; i < sourceStart.size; i++){
            Vector2 s = sourceStart.get(i);
            Vector2 e = sourceEnd.get(i);
            int segments = MathUtils.round((s.dst(e)) / targetLen);
            for (int seg = 0; seg < segments; seg++){
                float a = 1f/segments;
                float alpha = a * seg;
                float endAlpha = a * (seg + 1);

                Vector2 st = new Vector2(s);
                Vector2 en = new Vector2(s);
                st.lerp(e, alpha);
                en.lerp(e, endAlpha);

                adjustedSourceStart.add(st);
                adjustedSourceEnd.add(en);
//                Gdx.app.log(TAG, "adj " + st + en + " : " + i);
            }

        }
        shouldStopGenerating = new boolean[adjustedSourceStart.size];
        shouldStopTotal = 0;
    }
}
