(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const room = params.has('room') && params.get('room') !== null ? params.get('room') : 'server';
  console.log('room:', room);

  var pubnub = new PubNub({
    publishKey: 'demo',
    subscribeKey: 'demo'
  });

  var states = {
    name: '',
    msgs: []
  };

  var skipNames = ['chris', 'romain'];

  function initPubNub() {
    pubnub.addListener({
      message: function (data) {
        var msg = data && data.message ? data.message : {};
        var sender = msg.name || '';
        if (skipNames.indexOf(sender.toLowerCase()) !== -1) return;

        var type = sender === states.name ? 'sent' : 'received';
        var displayName = type === 'sent' ? states.name : sender;
        states.msgs.push({ name: displayName, text: msg.text, type: type });
      }
    });

    pubnub.subscribe({ channels: [room] });

    pubnub.history({ channel: room, count: 100 }, function (status, response) {
      var history = response && response.messages ? response.messages : [];
      for (var i = 0; i < history.length; i++) {
        var entry = history[i].entry || {};
        var sender = entry.name || '';
        if (skipNames.indexOf(sender.toLowerCase()) !== -1) continue;

        var type = sender === states.name ? 'sent' : 'received';
        states.msgs.push({
          name: sender,
          text: entry.text,
          type: type
        });
      }
    });
  }

  function initVue() {
    Vue.use(Framework7Vue);

    Vue.component('page-chat', {
      template: '#page-chat',
      data: function () {
        return states;
      },
      methods: {
        onSend: function (text, clear) {
          if (!text || text.trim().length === 0) return;
          pubnub.publish({
            channel: room,
            message: {
              text: text,
              name: this.name
            }
          });
          if (typeof clear === 'function') clear();
        },
        messagebarSubmit: function (event) {
          var detail = event && event.detail ? event.detail : {};
          var value = detail.value || '';
          var clearFn = typeof detail.clear === 'function' ? detail.clear : null;
          if (!value || value.trim().length === 0) return;
          this.onSend(value, clearFn);
        }
      },
      mounted: function () {
        var self = this;
        this.$nextTick(function () {
          var container = document.querySelector('.app-messagebar');
          if (!container) return;
          var ta = container.querySelector('textarea');
          if (!ta) return;
          ta.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              var value = ta.value || '';
              if (!value.trim()) return;
              self.onSend(value, function () { ta.value = ''; });
            }
          });
        });
      }
    });

    new Vue({
      el: '#app',
      data: function () {
        return states;
      },
      methods: {
        enterChat: function () {
          if (this.name.trim().length === 0) {
            alert('Please enter your name');
            return false;
          }
          this.msgs.length = 0;
          this.$f7.mainView.router.load({ url: '/chat/' });
          initPubNub();
        }
      },
      framework7: {
        root: '#app',
        material: Framework7.prototype.device && Framework7.prototype.device.android ? true : false,
        routes: [{
          path: '/chat/',
          component: 'page-chat'
        }]
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (Framework7.prototype.device && Framework7.prototype.device.android) {
      Dom7('.view.navbar-through').removeClass('navbar-through').addClass('navbar-fixed');
      Dom7('.view .navbar').prependTo('.view .page');
    }
    initVue();
  }, false);

})();
