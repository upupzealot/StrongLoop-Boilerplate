'use strict';

const co = require('co');
const loopback = require('loopback');
const app = require('../server.js');

module.exports = (Model, options) => {
  let Comment = loopback.findModel('Comment');
  if (!Comment) {
    const db = Model.getDataSource();
    Comment = db.createModel('Comment', {
      // properties
    }, {
      // options
      mixins: {
        HtmlField: {},
        Marks: {
          createdAt: 'created_at',
          createdBy: 'created_by',
          updatedAt: 'updated_at',
          updatedBy: 'updated_by',
        },
        Commentable: {},
      },
      relations: {
        commentable: {
          type: 'belongsTo',
          polymorphic: {
            foreignKey: 'commentable_id',
            discriminator: 'commentable_type',
          },
        },
        replied: {
          type: 'belongsTo',
          model: 'Comment',
          foreignKey: 'replied_id',
        },
      },
    });
    app.model(Comment, {
      public: true,
      dataSource: db,
    });

    Comment.observe('before save', (ctx, next) => {
      const instance = ctx.instance;
      if (instance && instance.commentable_type === 'Comment') {
        co(function*() {
          const comment = yield Comment.findById(instance.commentable_id);

          instance.commentable_id = comment.commentable_id;
          instance.commentable_type = comment.commentable_type;
          instance.replied_id = comment.id;

          next();
        }).catch(next);
      } else {
        next();
      }
    });
  }

  Model.hasMany('comment', {
    as: 'comments',
    polymorphic: {
      foreignKey: 'commentable_id',
      discriminator: 'commentable_type',
    },
  });
};