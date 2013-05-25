import event.Emitter as Emitter;

import .GridModel;

exports = Class(Emitter, function (supr) {
	this.init = function (opts) {
		supr(this, 'init', arguments);

		this._gridModel = opts.gridModel;
		this._tool = null;
		this._settings = opts.settings;
	};

	this._acceptRect = function (rect) {
		var conditions = this._tool.conditions;

		if (!conditions) {
			return false;
		}

		var result = false;
		var map = this._gridModel.getMap();
		var accept = conditions.accept;

		for (var i = 0; i < accept.length && !result; i++) {
			var condition = accept[i];
			switch (condition.type) {
				case 'emptyOrZero':
					result = map.isEmptyOrZero(condition.layer, rect.x, rect.y, rect.w, rect.h);
					break;

				case 'group':
					result = map.isGroup(condition.layer, rect.x, rect.y, rect.w, rect.h, condition.groups);
					break;
			}
		}
		return result;
	};

	this._declineRect = function (rect) {
		var conditions = this._tool.conditions;

		if (!conditions) {
			return false;
		}

		var result = false;
		var map = this._gridModel.getMap();
		var decline = conditions.decline;

		if (decline) {
			for (var i = 0; i < decline.length && !result; i++) {
				var condition = decline[i];
				switch (condition.type) {
					case 'notEmpty':
						if (!map.isEmpty(condition.layer, rect.x, rect.y, rect.w, rect.h)) {
							result = true;
						}
						break;

					case 'notEmptyAndNotGroup':
						if (!map.isEmpty(condition.layer, rect.x, rect.y, rect.w, rect.h) &&
							!map.isGroupOrEmpty(condition.layer, rect.x, rect.y, rect.w, rect.h, condition.groups)) {
							console.log('decline:');
							result = true;
						}
						break;

				}
			}
		}

		return result;
	};

	this.onApplySelection = function (selection) {
		var tool = this._tool;

		if (!tool || !selection || !selection.accept) {
			return;
		}

		var rect = this._gridModel.getRect(selection.startPoint, selection.endPoint);
		var map = this._gridModel.getMap();

		switch (tool.type) {
			case 'area':
				if ((rect.w >= tool.minWidth) && (rect.h >= tool.minHeight)) {
					map.drawRect(
						tool.layer,
						rect.x, rect.y, rect.w, rect.h,
						tool.group,
						tool.tileSet
					);
					this.emit('RefreshMap');
				}
				break;

			case 'line':
				if (rect.w > rect.h) {
					map.drawLineHorizontal(
						tool.layer,
						rect.x, rect.y, rect.w,
						tool.group,
						tool.tileSet.horizontal
					);
				} else {
					map.drawLineVertical(
						tool.layer,
						rect.x, rect.y, rect.h,
						tool.group,
						tool.tileSet.vertical
					);
				}
				tool.validator && tool.validator(map, tool, rect);
				this.emit('RefreshMap');
				break;

			case 'item':
				var modelInstance = false;
				var layer = tool.layer;
				var group = tool.group;
				var index = tool.index;
				var x = rect.x;
				var y = rect.y;

				if (tool.model) {
					modelInstance = new tool.model({
						map: map,
						layer: layer,
						group: group,
						index: index,
						x: rect.x,
						y: rect.y,
						surrounding: tool.surrounding
					}).on('Refresh', bind(this, 'publish', 'RefreshMap'));
					group = modelInstance.getGroup();
					index = modelInstance.getIndex();
				} else if (tool.surrounding) {
					map.drawSurrounding(x, y, layer, tool.surrounding);
				}

				for (var j = 0; j < tool.height; j++) {
					for (var i = 0; i < tool.width; i++) {
						map.drawTile(tool.layer, x + i, y + j, 0xFFFF, 0xFFFF, false);
					}
				}
				map.drawTile(tool.layer, x, y + tool.height - 1, group, index, modelInstance);
				this.emit('RefreshMap');
				break;

			case 'point':
				this._gridModel.emit('Point', rect.x, rect.y);
				break;
		}
	};

	this.onChangeSelection = function (selection) {
		if (!this._tool) {
			return;
		}

		var gridModel = this._gridModel;
		var rect = gridModel.getRect(selection.startPoint, selection.endPoint);

		selection.accept = false;

		var conditions = this._tool.conditions;
		if (conditions) {
			selection.accept = this._acceptRect(rect) && !this._declineRect(rect);
		}
	};

	this.setTool = function (tool) {
		var gridModel = this._gridModel;

		this._tool = this._settings[tool] || null;
		if (this._tool) {
			switch (this._tool.type) {
				case 'area':
					gridModel.setSelectMode(GridModel.selectModes.AREA);
					break;

				case 'line':
					gridModel.setSelectMode(GridModel.selectModes.LINE);
					break;

				case 'item':
					gridModel.setSelectMode(GridModel.selectModes.FIXED);
					gridModel.setFixedWidth(this._tool.width);
					gridModel.setFixedHeight(this._tool.height);
					break;

				case 'point':
					gridModel.setSelectMode(GridModel.selectModes.FIXED);
					break;
			}
		}
	};
});