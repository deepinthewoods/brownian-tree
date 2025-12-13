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
import com.badlogic.gdx.math.Intersector;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.math.Vector3;
import com.badlogic.gdx.scenes.scene2d.Actor;
import com.badlogic.gdx.scenes.scene2d.InputEvent;
import com.badlogic.gdx.scenes.scene2d.Stage;
import com.badlogic.gdx.scenes.scene2d.ui.Skin;
import com.badlogic.gdx.scenes.scene2d.ui.Table;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.scenes.scene2d.utils.ClickListener;
import com.badlogic.gdx.utils.Array;
import com.badlogic.gdx.utils.IntArray;
import com.badlogic.gdx.utils.ScreenUtils;
import com.kotcrab.vis.ui.VisUI;

import java.util.Arrays;
import java.util.Comparator;

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


	public IntArray parent = new IntArray();

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

	private float maxDistance;

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
				postCalculations();
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
		drawingScreen.makeAdjustedSourceLines();
		Gdx.app.log("main", "starting");
		start.clear();
		end.clear();
		parent.clear();

		width = Gdx.graphics.getWidth();
		height = Gdx.graphics.getHeight();

		postCalculations();
	}



	public void postCalculations() {
		IntArray sourceConnections = new IntArray();
		for (int i = 0; i < start.size; i++){
			if (collideSource(start.get(i), end.get(i))){
				sourceConnections.add(i);
			}
		}
		int[] mainLineDistance = new int[start.size];
		Arrays.fill(mainLineDistance, Integer.MAX_VALUE);
		//mark source lines as distance 0
		for (int i = 0; i < sourceConnections.size; i++) {
			int currentIdx = sourceConnections.get(i);
			while (currentIdx != -1) {
				mainLineDistance[currentIdx] = 0;
				currentIdx = parent.get(currentIdx);
			}
		}

		// BFS for distance from main path
		boolean changed;
		do {
			changed = false;
			for (int i = 0; i < start.size; i++) {
				if (mainLineDistance[i] == Integer.MAX_VALUE) {
					int parentDist = parent.get(i) == -1 ? Integer.MAX_VALUE : mainLineDistance[parent.get(i)];
					if (parentDist != Integer.MAX_VALUE) {
						mainLineDistance[i] = parentDist + 1;
						maxDistance = Math.max(maxDistance, mainLineDistance[i]);
						changed = true;
					}
				}
			}
		} while (changed);
		thickness.clear();
		thickness.addAll(mainLineDistance);
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
				boolean hitSource = false;
				if (collide(a, b, intersect, collIndex)){
					hasCollided= true;
					if (collIndex[0] == -2) continue;
					if (moveTries <= 1 && !randomStart) {
//						Gdx.app.log("main", "failed collision at source "+ moveTries);
						if (sourceIndex != -1) {
							drawingScreen.shouldStopGenerating[sourceIndex] = true;
							drawingScreen.shouldStopTotal++;
						}
						hitSource = true;
//						continue;
					}
					start.add(new Vector2(a));
					end.add(new Vector2(intersect));
					parent.add(collIndex[0]);
					//subdivide parent

					if (collIndex[0] != -1){
						if (intersect.dst2(start.get(collIndex[0])) < 0.1f){//close to start
							end.peek().set(start.get(collIndex[0]));
							Gdx.app.log("tree", "merge parent");;
						}else if (intersect.dst2(end.get(collIndex[0])) < 0.1f){//close to end, connect with parent's parent
							if (parent.get(collIndex[0]) != -1){
								parent.pop();
								parent.add(parent.get(collIndex[0]));
								end.peek().set(start.get(parent.get(collIndex[0])));
								Gdx.app.log("tree", "merge grandparent");;
							}
						}
						else {//subdivide
							Vector2 parentEnd = end.get(collIndex[0]);
							Vector2 extraStart = new Vector2(intersect);
							Vector2 extraEnd = new Vector2(parentEnd);
							parentEnd.set(intersect);
							int extraParent = parent.get(collIndex[0]);
							start.add(extraStart);
							end.add(extraEnd);
							parent.add(extraParent);
							parent.set(collIndex[0], parent.size-1);
						}


					}


					createdLines++;
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
	private boolean collideSource(Vector2 a, Vector2 b){
		v.set(a).sub(b).nor().scl(0.1f).add(b);
		for (int i = 0; i < drawingScreen.adjustedSourceEnd.size; i++) {
			Vector2 st = drawingScreen.adjustedSourceStart.get(i);
			Vector2 en = drawingScreen.adjustedSourceEnd.get(i);
			if (Intersector.intersectSegments(a, v, st, en, intersect)) return true;
		}
		return false;
	}
	private boolean collide(Vector2 a, Vector2 b, Vector2 coll, int[] index) {
		float dist = 100000000;
		boolean hasCollided = false;

		// Check collisions with existing tree segments
		for (int i = 0; i < start.size; i++) {
			Vector2 st = start.get(i);
			Vector2 en = end.get(i);
			if (Intersector.intersectSegments(a, b, st, en, v)) {
				if (v.dst(a) < dist) {
					dist = v.dst(a);
					coll.set(v);
					hasCollided = true;
					index[0] = i;
				}
			}
		}

		// Check collisions with destination lines
		for (int i = 0; i < drawingScreen.destStart.size; i++) {
			Vector2 st = drawingScreen.destStart.get(i);
			Vector2 en = drawingScreen.destEnd.get(i);
			if (Intersector.intersectSegments(a, b, st, en, v)) {
				if (v.dst(a) < dist) {
					dist = v.dst(a);
					coll.set(v);
					hasCollided = true;
					index[0] = -1;

				}
			}
		}

		// Check collisions with destination lines
		for (int i = 0; i < drawingScreen.excludeStart.size; i++) {
			Vector2 st = drawingScreen.excludeStart.get(i);
			Vector2 en = drawingScreen.excludeEnd.get(i);
			if (Intersector.intersectSegments(a, b, st, en, v)) {
				if (v.dst(a) < dist) {
					dist = v.dst(a);
					coll.set(v);
					hasCollided = true;
					index[0] = -2;

				}
			}
		}


		return hasCollided;
	}

	@Override
	public void render () {

		for (int i = 0; i < 8; i++) if (isProcessing){
			if (processTree()){
				isProcessing = false;
				postCalculations();
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
		Color mainColor = Color.RED;
		Color tipColor = Color.GREEN;
		Color tempColor = new Color();

		for (int i = 0; i < start.size; i++) {
			Vector2 st = start.get(i);
			Vector2 en = end.get(i);
			int dist = thickness.size > i?thickness.get(i):0;

			if (dist == 0) {
				shape.setColor(Color.WHITE);
			} else {
				float lerpFactor = MathUtils.clamp(dist / maxDistance, 0, 1);
				tempColor.r = MathUtils.lerp(mainColor.r, tipColor.r, lerpFactor);
				tempColor.g = MathUtils.lerp(mainColor.g, tipColor.g, lerpFactor);
				tempColor.b = MathUtils.lerp(mainColor.b, tipColor.b, lerpFactor);
				tempColor.a = 1;
				shape.setColor(tempColor);
			}

			shape.line(st, en);
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
		shape.setColor(Color.RED);
		shape.begin(ShapeRenderer.ShapeType.Line);
		for (int i = 0; i < drawingScreen.excludeStart.size; i++){
			Vector2 st = drawingScreen.excludeStart.get(i);
			Vector2 en = drawingScreen.excludeEnd.get(i);
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
		batch.begin();
		font.draw(batch, "lines: "+start.size+"", 10, 50);
		batch.end();
	}
	
	@Override
	public void dispose () {
		batch.dispose();
		img.dispose();
		VisUI.dispose();
	}
}
