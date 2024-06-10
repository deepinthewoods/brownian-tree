package ninja.trek.brownian;

import com.badlogic.gdx.ApplicationAdapter;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.files.FileHandle;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.math.Interpolation;
import com.badlogic.gdx.math.Intersector;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.math.Vector3;
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


	public IntArray parent = new IntArray(),  children = new IntArray();

	public IntArray thickness = new IntArray();

	private Vector2 a  = new Vector2(), b = new Vector2(), v = new Vector2(), intersect = new Vector2(), tmp = new Vector2(), target = new Vector2();
	private Vector3 v3 = new Vector3();
	int[] collIndex = new int[1];
	private int width;
	private int height;
	private DrawingScreen drawingScreen;
	private int maxTries;
	private int tries;
	private int createdLines;
	private int targetLineCount;
	private int childLimit;
	private boolean randomStart;
	private float lineLengthMin;
	private float lineLengthMax;
	private boolean nearest;
	private float angle;
	private boolean isProcessing;
	private boolean isDrawing;
	private SVGExporter exporter;
	private BitmapFont font;

	@Override
	public void create () {
		batch = new SpriteBatch();
		camera = new OrthographicCamera(Gdx.graphics.getWidth(), Gdx.graphics.getHeight());
		camera.position.set(Gdx.graphics.getWidth()/2, Gdx.graphics.getHeight()/2, 0);
//		batch.setTransformMatrix(camera.combined);
		shape = new ShapeRenderer();
		img = new Texture("badlogic.jpg");
		VisUI.load();
		Skin skin = VisUI.getSkin();
		font = skin.getFont("default-font");

//		Gdx.app.log("main", "fonts " + skin.getAll(BitmapFont.class));
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
				isDrawing = true;
			}
		});

		TextButton exportBtn = new TextButton("Export", skin);
		exportBtn.addListener(new ClickListener(){
			@Override
			public void clicked(InputEvent event, float x, float y) {
				FileHandle file = Gdx.files.external("output.svg");
				SVGExporter.exportToSVG(start, end, file);
				super.clicked(event, x, y);
			}
		});

		TextButton stopBtn = new TextButton("   STOP   ", skin);
		stopBtn.addListener(new ClickListener(){
			@Override
			public void clicked(InputEvent event, float x, float y) {
				isProcessing = false;
				calculateThicknesses();
			}
		});

		mainTable.add(resetBtn).left();
		mainTable.add(drawBtn).left();
		mainTable.add(exportBtn).left();
		mainTable.add(stopBtn);
		mainTable.add(new Actor()).expandX().row();

		mainTable.add(new Settings(this));
		mainTable.add(new Actor()).expand().row();
		mainTable.add(new Settings(this));
		mainTable.add(new Actor()).expand().row();
		mainTable.add(new Settings(this));
		mainTable.add(new Actor()).expand().row();
//		mainTable.add(new Settings(this));
//		mainTable.add(new Actor()).expand().row();

		mainTable.setFillParent(true);
		mainScreen();
		Gdx.input.setInputProcessor(stage);

		resetTree();
	}

	public void mainScreen() {
		stage.clear();
		stage.addActor(mainTable);
		isDrawing = false;
	}

	public void resetTree(){
		Gdx.app.log("main", "starting");
		start.clear();
		end.clear();
		parent.clear();
		children.clear();
		width = Gdx.graphics.getWidth();
		height = Gdx.graphics.getHeight();
		calculateThicknesses();
	}

	public void calculateThicknesses(){
		Gdx.app.log("main", "thickness");
		int[] t = new int[start.size];
//		int[] children = new int[start.size];
//		for (int i = 0; i < start.size; i++){
//			if (parent.get(i) != -1)
//				children[parent.get(i)]++;
//		}
//		for (int i = 0; i < start.size; i++) {
//			if (children[i] == 0){
//				int current = i;
//				while (parent.get(current) != -1){
//					current = parent.get(current);
//					t[current] = Math.min(MAX_THICKNESS, t[current]+1);
//				}
//			}
//		}
//		int maxThickness = 0;
//		for (int i = 0; i <  start.size; i++){
//			maxThickness = Math.max(maxThickness, t[i]);
//		}
//		for (int i = 0; i <  start.size; i++){
//			float delta = (float)t[i] / maxThickness;
////			t[i] = (int)MathUtils.lerp(1, MAX_THICKNESS, delta);
//			t[i] = (int)Interpolation.exp10In.apply(0, MAX_THICKNESS, delta);
//
//			//Gdx.app.log("thickness adjustment ", ""+t[i]);
//		}

		thickness.addAll(t);
	}

	public void createTree(boolean nearest, int targetLineCount, float angle, int childLimit, boolean randomStart, float lineLengthMin, float lineLengthMax) {
		Gdx.app.log("main", "start" +nearest+targetLineCount + " " + angle);
//		MathUtils.random.setSeed(1);
		maxTries = targetLineCount * 10;
		tries = 0;
		createdLines = 0;
		this.nearest = nearest;
		this.angle = angle;
		this.targetLineCount = targetLineCount;
		this.childLimit = childLimit;
		this.randomStart = randomStart;
		this.lineLengthMin = lineLengthMin;
		this.lineLengthMax = lineLengthMax;
		this.isProcessing = true;
		if(lineLengthMin > lineLengthMax){
			float tmp = lineLengthMax;
			lineLengthMax = lineLengthMin;
			lineLengthMin = tmp;
		}
	}

	public boolean processTree(){
		if (tries++ < maxTries && createdLines < targetLineCount){
			int sourceIndex = -1;
			if (randomStart){
				a.set(MathUtils.random(width), MathUtils.random(height));
			} else {
				if (drawingScreen.shouldStopTotal == drawingScreen.adjustedSourceStart.size) return true;
				boolean foundStart = false;
				while (!foundStart){
					sourceIndex = MathUtils.random(drawingScreen.adjustedSourceStart.size-1);
					if (drawingScreen.shouldStopGenerating[sourceIndex]) continue;
					a.set(drawingScreen.adjustedSourceStart.get(sourceIndex));
					float alpha = MathUtils.random(1f);
					a.lerp(drawingScreen.adjustedSourceEnd.get(sourceIndex), alpha);
					break;
				}
			}
			float lineLengthDelta = (float)createdLines / targetLineCount;
			float lineLength = MathUtils.lerp(lineLengthMax, lineLengthMin, lineLengthDelta);
//			Gdx.app.log("main", "iterating" +lineLength);
			boolean hasCollided = false;
			int moveTries = 0;
			while (moveTries++ < 1000 && !hasCollided){
				v.set(-lineLength, 0);
				float targetAngle;
				if (nearest){
					setClosestPoint(target, a);
					targetAngle = tmp.set(a).sub(target).angleDeg();
				}
				else{
//					target.set(width/2, height/2);
					targetAngle = MathUtils.random(360f);
				}
				v.rotateDeg(MathUtils.random(-angle, angle) + targetAngle);
				b.set(a).add(v);
//				Gdx.app.log("main", "moved"+ a + "  angle " + targetAngle + " " + target);//tmp.set(a).sub(b).angleDeg());
				if (b.x <  0 || b.x > width || b.y < 0 || b.y > height){
					hasCollided = true;
//					Gdx.app.log("main", "failed oob");
					continue;
				}
				if (collide(a, b, intersect, collIndex)){
					hasCollided= true;
					if (moveTries <= 1 && !randomStart) {
						Gdx.app.log("main", "failed collision at source "+ moveTries);
						if (sourceIndex != -1) {
							drawingScreen.shouldStopGenerating[sourceIndex] = true;
							drawingScreen.shouldStopTotal++;
						}
//						continue;
					}
					if (collIndex[0] == -1 || parent.get(collIndex[0]) == -1){
						children.add(0);
					} else {
						int ch = children.get(parent.get(collIndex[0]))+1;
						if (ch > childLimit) continue;
						children.add(ch);
//						Gdx.app.log("Main", "children " + ch);
					}
					start.add(new Vector2(a));
					end.add(new Vector2(intersect));
					Vector2 c = new Vector2(a);
					c.lerp(intersect, 0.5f);

					parent.add(collIndex[0]);
					createdLines++;
//					end.add(new Vector2(b));
//					Gdx.app.log("main", "collided "+a+collIndex[0]);
				}
				a.set(b);
			}
//			if (!hasCollided) Gdx.app.log("main", "failed to collide "+a+collIndex[0]);
		} else {


			return true;

		}
		return false;
		//		Gdx.app.log("main", "done " + start.size);
	}

	private void setClosestPoint(Vector2 target, Vector2 a) {

		float dist = 1000000000;
		for (int i = 0; i < start.size; i++){
			Vector2 s = start.get(i);
			Vector2 e = end.get(i);
//			if (a.dst2(centre.get(i)) < dist){
			float d = Intersector.distanceSegmentPoint(s, e, a);
			if (d < dist){
				dist = d;
				Intersector.nearestSegmentPoint(s, e, a, target);
			}
		}
		for (int i = 0; i < drawingScreen.destStart.size; i++){
			Vector2 s = drawingScreen.destStart.get(i);
			Vector2 e = drawingScreen.destEnd.get(i);
			float d = Intersector.distanceSegmentPoint(s, e, a);
			if (d < dist){
				dist = d;
				Intersector.nearestSegmentPoint(s, e, a, target);
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
		for (int i = 0; i < drawingScreen.destStart.size; i++){
			Vector2 st = drawingScreen.destStart.get(i);
			Vector2 en = drawingScreen.destEnd.get(i);
			if (Intersector.intersectSegments(a, b, st, en, v)){
//				Gdx.app.log("cllide", "intersect " + a + b + " with " +st + en);
				if (v.dst(a) < dist){
					dist = v.dst(a);
					coll.set(v);
					hasCollided = true;
					index[0] = -1;
				}
			};
		}
		return hasCollided;
	}

	@Override
	public void render () {

		for (int i = 0; i < 8; i++) if (isProcessing){
			if (processTree()){
				isProcessing = false;
				calculateThicknesses();
			}
		}

		ScreenUtils.clear(0, 0, 0, 1);
		camera.update();
		batch.setProjectionMatrix(camera.combined);
//		batch.begin();
//		batch.draw(img, 0, 0);
//		batch.end();

		shape.setProjectionMatrix(camera.combined);

//		for (int t = 0; t < MAX_THICKNESS+1; t++){
		shape.begin(ShapeRenderer.ShapeType.Line);
		shape.setColor(Color.WHITE);
//			Gdx.gl.glLineWidth(t+2.0f);
		for (int i = 0; i < start.size; i++){
			Vector2 st = start.get(i);
			Vector2 en = end.get(i);
//				int thick = thickness.get(i);
//				if (thick == t)
			shape.line(st, en);
//				Gdx.app.log("main", "drawing " + st + en);
		}
		if (drawingScreen.isFirstPoint){
			v3.set(Gdx.input.getX(), Gdx.input.getY(), 0);
			camera.unproject(v3);
			v.set(v3.x, v3.y);
			shape.line(drawingScreen.current, v);
		}
		shape.end();
		shape.setColor(Color.GREEN);
		shape.begin(ShapeRenderer.ShapeType.Line);
		for (int i = 0; i < drawingScreen.destStart.size; i++){
			Vector2 st = drawingScreen.destStart.get(i);
			Vector2 en = drawingScreen.destEnd.get(i);
			int thick = 1;
//				if (0 == t)
			shape.line(st, en);
//				Gdx.app.log("main", "drawing " + st + en);
		}
		shape.end();
		if (isDrawing){
			shape.setColor(Color.CYAN);
			shape.begin(ShapeRenderer.ShapeType.Line);
			for (int i = 0; i < drawingScreen.sourceStart.size; i++){
				Vector2 st = drawingScreen.sourceStart.get(i);
				Vector2 en = drawingScreen.sourceEnd.get(i);
				shape.line(st, en);
			}
			shape.end();
		} else {
			shape.setColor(Color.CYAN);
			shape.begin(ShapeRenderer.ShapeType.Line);
			for (int i = 0; i < drawingScreen.adjustedSourceStart.size; i++){
				Vector2 st = drawingScreen.adjustedSourceStart.get(i);
				Vector2 en = drawingScreen.adjustedSourceEnd.get(i);
				if (!drawingScreen.shouldStopGenerating[i]) shape.line(st, en);
			}
			shape.end();

			shape.setColor(Color.BLUE);
			shape.begin(ShapeRenderer.ShapeType.Line);
			for (int i = 0; i < drawingScreen.adjustedSourceStart.size; i++){
				Vector2 st = drawingScreen.adjustedSourceStart.get(i);
				Vector2 en = drawingScreen.adjustedSourceEnd.get(i);
				if (drawingScreen.shouldStopGenerating[i]) shape.line(st, en);
//				Gdx.app.log("main", "drawing " + st + en);
			}
			shape.end();
		}

//		}

//		stage.setDebugAll(true);
		stage.draw();

		batch.setProjectionMatrix(camera.combined);
		if (isProcessing && createdLines > 0){
			batch.begin();
			String progress = "" + (int)(((float)createdLines / targetLineCount) * 100);
			font.draw(batch, "[FOREST]"+progress+"%", 10, 30);
			batch.end();

		}
	}
	
	@Override
	public void dispose () {
		batch.dispose();
		img.dispose();
		VisUI.dispose();
	}
}
