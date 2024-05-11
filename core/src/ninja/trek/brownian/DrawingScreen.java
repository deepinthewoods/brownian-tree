package ninja.trek.brownian;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.scenes.scene2d.InputEvent;
import com.badlogic.gdx.scenes.scene2d.InputListener;
import com.badlogic.gdx.scenes.scene2d.Touchable;
import com.badlogic.gdx.scenes.scene2d.ui.Label;
import com.badlogic.gdx.scenes.scene2d.ui.Skin;
import com.badlogic.gdx.scenes.scene2d.ui.Stack;
import com.badlogic.gdx.scenes.scene2d.ui.Table;
import com.badlogic.gdx.scenes.scene2d.Actor;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.scenes.scene2d.ui.Widget;
import com.badlogic.gdx.scenes.scene2d.ui.WidgetGroup;
import com.badlogic.gdx.scenes.scene2d.utils.ClickListener;
import com.badlogic.gdx.utils.Array;
import com.kotcrab.vis.ui.VisUI;

public class DrawingScreen extends Stack {
    public Array<Vector2> start = new Array<Vector2>(), end = new Array<Vector2>();
    private boolean isFirstPoint = true;
    public DrawingScreen(final BrownianTreeGen parent){
        Skin skin = VisUI.getSkin();
        Table backTable = new Table();
        TextButton clear = new TextButton("clear", skin);
        clear.addListener(new ClickListener(){
            @Override
            public void clicked(InputEvent event, float x, float y) {
                start.clear();
                end.clear();
            }
        });
        backTable.add(clear).top();
        TextButton back = new TextButton("back", skin);
        back.addListener(new ClickListener(){
            @Override
            public void clicked(InputEvent event, float x, float y) {

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
                Gdx.app.log("draw", "touch " + x + " " + y + isFirstPoint);
                if (isFirstPoint)
                    start.add(new Vector2(x, y));
                else{
                    end.add(new Vector2(x, y));
                    parent.resetTree();
                }
                isFirstPoint = !isFirstPoint;

                return true;
            }
        });
//        actor.addListener(new ClickListener(){
//            @Override
//            public void clicked(InputEvent event, float x, float y) {
//                Gdx.app.log("draw", "click " );
//
//
//            }
//        });
        actor.setTouchable(Touchable.enabled);
        setTouchable(Touchable.enabled);

        add(actor);//.expand();
        add(backTable);
        setFillParent(true);
    }
}
