package ninja.trek.brownian;

import com.badlogic.gdx.ApplicationAdapter;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.math.Interpolation;
import com.badlogic.gdx.math.Intersector;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.scenes.scene2d.Actor;
import com.badlogic.gdx.scenes.scene2d.InputEvent;
import com.badlogic.gdx.scenes.scene2d.Stage;
import com.badlogic.gdx.scenes.scene2d.ui.Button;
import com.badlogic.gdx.scenes.scene2d.ui.Skin;
import com.badlogic.gdx.scenes.scene2d.ui.Table;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.scenes.scene2d.utils.ClickListener;
import com.badlogic.gdx.utils.Array;
import com.badlogic.gdx.utils.GdxRuntimeException;
import com.badlogic.gdx.utils.IntArray;
import com.badlogic.gdx.utils.ScreenUtils;
import com.kotcrab.vis.ui.VisUI;

import org.w3c.dom.Text;

public class BrownianTreeGen extends ApplicationAdapter {
	private static final int MAX_THICKNESS = 2;
	SpriteBatch batch;
	Texture img;
	private ShapeRenderer shape;
	private OrthographicCamera camera;
	private Stage stage;
	private Table mainTable;

	public Array<Vector2> start = new Array<Vector2>();
	public Array<Vector2> end = new Array<Vector2>();
	public Array<Vector2> centre = new Array<Vector2>();



	public IntArray parent = new IntArray();

	public IntArray thickness = new IntArray();

	private Vector2 a  = new Vector2(), b = new Vector2(), v = new Vector2(), intersect = new Vector2(), tmp = new Vector2(), target = new Vector2();

	int[] collIndex = new int[1];
	private int width;
	private int height;
	private DrawingScreen drawingScreen;

	@Override
	public void create () {
		batch = new SpriteBatch();
		camera = new OrthographicCamera(Gdx.graphics.getWidth(), Gdx.graphics.getHeight());
		camera.position.set(Gdx.graphics.getWidth()/2, Gdx.graphics.getHeight()/2, 0);
		batch.setTransformMatrix(camera.combined);
		shape = new ShapeRenderer();
		img = new Texture("badlogic.jpg");
		VisUI.load();
		Skin skin = VisUI.getSkin();
		stage = new Stage();
		drawingScreen = new DrawingScreen(this);
		mainTable = new Table();
//		Button createBtn = new TextButton("Create", skin);
//		createBtn.addListener(new ClickListener(){
//			@Override
//			public void clicked(InputEvent event, float x, float y) {
//				super.clicked(event, x, y);
//				resetTree();
//				createTree(true, true, 50, 10);
//				createTree(true, false, 600, 45);
//
//			}
//		});
//		mainTable.add(createBtn);

		TextButton resetBtn = new TextButton("reset", skin);
		resetBtn.addListener(new ClickListener(){
			@Override
			public void clicked(InputEvent event, float x, float y) {
				resetTree();
			}
		});
		TextButton drawBtn = new TextButton("draw", skin);
		drawBtn.addListener(new ClickListener(){
			@Override
			public void clicked(InputEvent event, float x, float y) {
				stage.clear();
				stage.addActor(drawingScreen);
			}
		});
		mainTable.add(resetBtn);
		mainTable.add(drawBtn);
		mainTable.add(new Actor()).expandX().row();

		mainTable.add(new Settings(this));
		mainTable.add(new Actor()).expand().row();
		mainTable.add(new Settings(this));
		mainTable.add(new Actor()).expand().row();
		mainTable.add(new Settings(this));
		mainTable.add(new Actor()).expand().row();
		mainTable.add(new Settings(this));
		mainTable.add(new Actor()).expand().row();

		mainTable.setFillParent(true);
		mainScreen();
		Gdx.input.setInputProcessor(stage);

		resetTree();
	}

	public void mainScreen() {
		stage.clear();
		stage.addActor(mainTable);
	}

	public void resetTree(){
		Gdx.app.log("main", "starting");
		start.clear();
		end.clear();
		parent.clear();
		centre.clear();

		width = 900;
		height = 900;
		for (int i = 0; i < drawingScreen.start.size; i++){
			start.add(new Vector2(drawingScreen.start.get(i)));
			end.add(new Vector2(drawingScreen.end.get(i)));
			Vector2 c = new Vector2(drawingScreen.start.get(i)).lerp(drawingScreen.end.get(i), 0.5f);
			centre.add(c);
			parent.add(-1);
			Gdx.app.log("reset", "add"+start.peek());
		}
		calculateThicknesses();
//		start.add(new Vector2(width/2-10, height/2-10));
//		end.add(new Vector2(width/2+10, height/2+10));
//		centre.add(new Vector2(width/2, height/2));
//		parent.add(-1);
	}

	public void calculateThicknesses(){
		int[] t = new int[start.size];
		int[] children = new int[start.size];
		for (int i = drawingScreen.start.size; i < start.size; i++){
			children[parent.get(i)]++;
		}
		for (int i = drawingScreen.start.size; i < start.size; i++) {
			if (children[i] == 0){
				int current = i;
				while (parent.get(current) != -1){
					current = parent.get(current);
					t[current] = Math.min(MAX_THICKNESS, t[current]+1);
				}
			}
		}
		int maxThickness = 0;
		for (int i = 0; i <  start.size; i++){
			maxThickness = Math.max(maxThickness, t[i]);
		}
		for (int i = 0; i <  start.size; i++){
			float delta = (float)t[i] / maxThickness;
//			t[i] = (int)MathUtils.lerp(1, MAX_THICKNESS, delta);
			t[i] = (int)Interpolation.exp10In.apply(0, MAX_THICKNESS, delta);

			//Gdx.app.log("thickness adjustment ", ""+t[i]);
		}

		thickness.addAll(t);
	}

	public void createTree(boolean outside, boolean nearest, int targetLineCount, float angle) {
		Gdx.app.log("main", "start" +outside+nearest+targetLineCount + " " + angle);
//		MathUtils.random.setSeed(1);
		//add start lines
		

		int maxTries = 221100;

		float lineLengthMax = 27;
		float lineLengthMin = 14;
		int tries = 0;
		int createdLines = 0;

		while (tries++ < maxTries && createdLines < targetLineCount){

			if (outside) switch (MathUtils.random(3)){
				case 0:a.set(MathUtils.random(width), 0);break;
				case 1:a.set(MathUtils.random(width), height);break;
				case 2:a.set(0, MathUtils.random(height));break;
				case 3:a.set(width, MathUtils.random(height));break;
				default: throw new GdxRuntimeException("no");
			} else a.set(MathUtils.random(width), MathUtils.random(height));

			float lineLengthDelta = (float)start.size / targetLineCount;
			float lineLength = MathUtils.lerp(lineLengthMax, lineLengthMin, lineLengthDelta);

//			Gdx.app.log("main", "iterating" +lineLength);
			boolean hasCollided = false;
			int moveTries = 0;
			while (moveTries++ < 1000 && !hasCollided){
				v.set(-lineLength, 0);

				if (nearest) setClosestPoint(target, a);
				else target.set(width/2, height/2);

				float targetAngle = tmp.set(a).sub(target).angleDeg();
				v.rotateDeg(MathUtils.random(-angle, angle) + targetAngle);
				b.set(a).add(v);
//				Gdx.app.log("main", "moved"+ a);//tmp.set(a).sub(b).angleDeg());
				if (b.x <  0 || b.x > width || b.y < 0 || b.y > height){
					hasCollided = true;
//					Gdx.app.log("main", "failed");
					continue;
				}
				if (collide(a, b, intersect, collIndex)){
					hasCollided= true;
					if (moveTries == 1) continue;
					start.add(new Vector2(a));
					end.add(new Vector2(intersect));
					Vector2 c = new Vector2(a);
					c.lerp(intersect, 0.5f);
					centre.add(c);
					parent.add(collIndex[0]);
					createdLines++;
//					end.add(new Vector2(b));
//					Gdx.app.log("main", "col "+a+collIndex[0]);
				}
				a.set(b);
			}


		}


		//		Gdx.app.log("main", "done " + start.size);
		calculateThicknesses();
	}

	private void setClosestPoint(Vector2 target, Vector2 a) {
		float dist = 1000000000;
		for (int i = 0; i < centre.size; i++){
			if (a.dst2(centre.get(i)) < dist){
				dist = a.dst2(centre.get(i));
				target.set(centre.get(i));
			}
		}
	}

	private boolean collide(Vector2 a, Vector2 b, Vector2 coll, int[] index){
		float dist = 100000000;
		boolean hasCollided = false;
		for (int i = 0; i < start.size; i++){
			Vector2 st = start.get(i);
			Vector2 en = end.get(i);
			if (Intersector.intersectSegments(a, b, st, en, v)){
//				Gdx.app.log("cllide", "intersect " + a + b + " with " +st + en);
				if (v.dst(a) < dist){
					dist = v.dst(a);
					coll.set(v);
					hasCollided = true;
					index[0] = i;
				}
			};
		}
		return hasCollided;
	}

	@Override
	public void render () {
		ScreenUtils.clear(0, 0, 0, 1);
		camera.update();
		batch.begin();
		batch.draw(img, 0, 0);
		batch.end();
		shape.setProjectionMatrix(camera.combined);

		for (int t = 0; t < MAX_THICKNESS+1; t++){
			shape.begin(ShapeRenderer.ShapeType.Line);
			shape.setColor(Color.WHITE);
			Gdx.gl.glLineWidth(t+2.0f);
			for (int i = 0; i < start.size; i++){
				Vector2 st = start.get(i);
				Vector2 en = end.get(i);
				int thick = thickness.get(i);
				if (thick == t) shape.line(st, en);
//				Gdx.app.log("main", "drawing " + st + en);
			}
			shape.end();
		}

//		stage.setDebugAll(true);
		stage.draw();
	}
	
	@Override
	public void dispose () {
		batch.dispose();
		img.dispose();
		VisUI.dispose();
	}
}
