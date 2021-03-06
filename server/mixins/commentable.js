'use strict';

const loopback = require('loopback');

module.exports = (Model, options) => {
  // 生成 Model: Comment
  require('./models/comment');
  // 生成 Role : CommentDeletor
  require('./models/comment-deletor');

  if (Model.modelName !== 'Comment') {
    Model.hasMany('comment', {
      as: 'comments',
      polymorphic: {
        foreignKey: 'commentable_id',
        discriminator: 'commentable_type',
      },
    });
  } else {
    Model.defineProperty('commentable_id', {
      type: Number,
    });
    Model.defineProperty('commentable_type', {
      type: String,
    });
    Model.hasMany('comment', {
      as: 'comments',
      foreignKey: 'parent_id',
    });
  }

  loopback.configureModel(Model, {
    dataSource: Model.dataSource,
    acls: [
      {
        accessType: 'EXECUTE',
        principalType: 'ROLE',
        principalId: '$authenticated',
        permission: 'ALLOW',
        property: '__create__comments',
      },
    ],
  });

  Model.disableRemoteMethodByName('prototype.__get__comments');
  // Model.disableRemoteMethodByName('prototype.__create__comments');
  Model.disableRemoteMethodByName('prototype.__delete__comments');
  Model.disableRemoteMethodByName('prototype.__update__comments');
  Model.disableRemoteMethodByName('prototype.__count__comments');
  Model.disableRemoteMethodByName('prototype.__destroyById__comments');
  Model.disableRemoteMethodByName('prototype.__findById__comments');
  Model.disableRemoteMethodByName('prototype.__updateById__comments');
};
