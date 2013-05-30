import event.Emitter as Emitter;

import .models.GridModel as GridModel;
import .models.GridInputModel as GridInputModel;
import .models.GridEditor as GridEditor;
import .models.item.DynamicModel as DynamicModel;

import .views.WorldView as WorldView;

import .ModelViewConnector;

/**
 * Wrapper class for both isometric models and views.
 *
 * Events:
 *  - SelectionCount
 *      Published when an area is selected for drawing.
 *      Parameter: null|{total,changed}
 * - SelectionEnd
 *      End of selecting an area.
 * - SelectItem
 *      Select an item.
 * - UnselectItem
 *      Unselect by clicking on an "empty" spot.
 * - Edit
 *      Published when map is editted.
 */
exports = Class(Emitter, function (supr) {
	this.init = function (opts) {
		supr(this, 'init', arguments);

		// Create views...
		this._worldView = new WorldView(opts);
		this._worldView.
			on('ChangeOffset', bind(this, 'onChangeOffset'));

		var gridView = this._worldView.getGridView();
		var gridInputView = this._worldView.getGridInputView();

		// Create models...
		this._gridModel = new GridModel({
			gridSettings: opts.gridSettings,
			mapSettings: opts.mapSettings
		});

		this._gridEditor = new GridEditor({
			gridModel: this._gridModel,
			settings: opts.editorSettings
		});
		this._gridEditor.
			on('RefreshMap', bind(gridView, 'onRefreshMap')).
			on('AddModel', bind(this, 'onAddStaticModel')).
			on('SelectionCount', bind(this, 'emit', 'SelectionCount'));

		this._gridModel.
			on('Update', bind(gridView, 'onUpdate')).
			on('RefreshMap', bind(gridView, 'onRefreshMap')).
			on('AddParticles', bind(gridView, 'onAddParticles')).
			on('Edit', bind(this, 'emit', 'Edit')).
			on('SelectionChange', bind(this._gridEditor, 'onSelectionChange')).
			on('Selection', bind(this._gridEditor, 'onSelectionApply')).
			on('Progress', bind(this, 'onProgress')).
			on('Point', bind(this, 'onPoint'));

		this._gridInputModel = new GridInputModel({
			gridModel: this._gridModel
		});
		this._gridInputModel.
			on('Selection', bind(this._gridEditor, 'onSelectionApply'));

		// Connect views...
		gridInputView.
			on('Start', bind(this._gridInputModel, 'onStart')).
			on('Drag', bind(this._gridInputModel, 'onDrag')).
			on('End', bind(this._gridInputModel, 'onEnd')).
			on('Select', bind(this._gridInputModel, 'onSelect')).
			on('SelectCancel', bind(this._gridInputModel, 'onSelectCancel')).
			on('End', bind(this, 'emit', 'SelectionEnd'));

		gridView.
			on('Ready', bind(this, 'emit', 'Ready')).
			on('SelectItem', bind(this, 'emit', 'SelectItem')).
			on('UnselectItem', bind(this, 'emit', 'UnselectItem')).
			on('InputStart', bind(gridInputView, 'onInputStart')).
			on('InputMove', bind(gridInputView, 'onInputMove')).
			on('InputSelect', bind(gridInputView, 'onInputSelect'));

		this._modelViewConnector = new ModelViewConnector({
			gridView: gridView
		});
	};

	this.tick = function (dt) {
		this._gridModel.tick(dt);
		this._modelViewConnector.tick(dt);
	};

	this.onProgress = function (progress) {
		this._worldView.setProgress((100 * progress) | 0);
	};

	this.onChangeOffset = function (offsetX, offsetY) {
		this._gridModel.scrollBy(offsetX, offsetY);
	};

	this.onAddStaticModel = function (model) {
		this._gridModel.getStaticModels().add(model);

		model.on('SpawnedModel', bind(this, 'onAddDynamicModel'));
		model.on('SpawnedModel', bind(this, 'emit', 'DynamicModel'));
		model.on('WakeupModel', bind(this, 'onWakeupDynamicModel'));

		this.emit('StaticModel', model);		
	};

	this.onAddDynamicModel = function (model) {
		this._modelViewConnector.registerModel(model, 1);
	};

	this.onWakeupDynamicModel = function (model) {
		this._modelViewConnector.wakeupModel(model);
	};

	this.getGridModel = function () {
		return this._gridModel;
	};

	this.getStaticModels = function () {
		return this._gridModel.getStaticModels();
	};

	this.getGridEditor = function () {
		return this._gridEditor;
	};

	this.getGridView = function () {
		return this._worldView.getGridView();
	};

	this.getGridInputView = function () {
		return this._worldView.getGridInputView();
	};
});