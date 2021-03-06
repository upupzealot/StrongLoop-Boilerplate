'use strict';

const co = require('co');
const loopback = require('loopback');
const app = require('../../server.js');

const config = require('../../config/index.js');

let Comment = loopback.findModel('Comment');
if (!Comment) {
  const db = app.dataSources.db;

  // 创建 Comment Model
  Comment = db.createModel('Comment', {
    // properties
  }, {
    // options
    description: '评论',
    mixins: {
      HtmlField: {},
      Marks: {
        createdAt: true,
        createdBy: true,
        updatedAt: true,
        updatedBy: true,
      },
      Commentable: {},

      AutoSubscription: {},
      NotificationTrigger: {
        create: true,
      },

      RemoteRouting: {
        only: [
          '@deleteById',
        ],
      },
    },
    relations: {
      creator: {
        type: 'belongsTo',
        model: 'user',
        foreignKey: config.marksMixin.createdBy,
      },
      commentable: {
        type: 'belongsTo',
        polymorphic: {
          foreignKey: 'commentable_id',
          discriminator: 'commentable_type',
        },
      },
      parent: {
        type: 'belongsTo',
        model: 'Comment',
        foreignKey: 'parent_id',
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

  // Comment 特有的逻辑
  Comment.observe('before save', (ctx, next) => {
    const instance = ctx.instance;
    // 回复是楼中楼
    if (instance && instance.parent_id) {
      co(function*() {
        const comment = yield Comment.findById(instance.parent_id);
        instance.commentable_id = comment.commentable_id;
        instance.commentable_type = comment.commentable_type;

        // 直接楼中楼
        if (comment && !comment.parent_id) {
          instance.parent_id = comment.id;

        // 回复楼中楼的楼中楼
        } else {
          instance.parent_id = comment.parent_id;
          instance.replied_id = comment.id;
        }

        next();
      }).catch(next);

    // 直接回复，不是楼中楼
    } else {
      next();
    }
  });
}

module.exports = Comment;
