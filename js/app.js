(function () {
    'use strict';

    var pubnub = new PubNub({
        publishKey: 'demo',
        subscribeKey: 'demo'
    });
    
    var states = {
        name: '',
        msgs: []
    };
    
    // Names to hide (case-insensitive)
    var skipNames = ['chris', 'romain'];

    /**
     * Initializes pubnub service
     */
    function initPubNub() {

        // Call event listener when new msg comes in
        pubnub.addListener({
            message: function(data) {
                var msg = data && data.message ? data.message : {};
                var sender = msg.name || '';
                if (skipNames.indexOf(sender.toLowerCase()) !== -1) return; // skip unwanted senders

                var type = sender === states.name ? 'sent' : 'received';
                var displayName = type === 'sent' ? states.name : sender;
                states.msgs.push({ name: displayName, text: msg.text, type: type });
            }
        });

        // Subscribe to these channels
        pubnub.subscribe({
            channels: ['server']
        });
        
        // Load chat history
        pubnub.history(
            {
                channel : 'server',
                count : 100
            },
            function (status, response) {
                var history = response && response.messages ? response.messages : [];
                for (var i = 0; i < history.length; i++) {
                    var entry = history[i].entry || {};
                    var sender = entry.name || '';
                    if (skipNames.indexOf(sender.toLowerCase()) !== -1) continue; // skip unwanted senders

                    var type = sender === states.name ? 'sent' : 'received';
                    states.msgs.push({
                        name: sender,
                        text: entry.text,
                        type: type
                    });
                }
            }
        );
    }
    
    /**
     * Initializes all Vue templates
     */
    function initVue () {

        // Tell Vue that we want to use Framework7-Vue plugin
        Vue.use(Framework7Vue);
        
        // Init chat template
        Vue.component('page-chat', {
            template: '#page-chat',
            data: function() {
                return states;
            },
            methods: {
                /**
                 * Existing send helper (keeps same signature)
                 *
                 * @param {string} text The msg to send
                 * @param {function} clear Call this function to clear the message bar component
                 */
                onSend: function(text, clear) {
                    if (!text || text.trim().length === 0) return;
                    pubnub.publish({
                        channel: 'server',
                        message: {
                            text: text,
                            name: this.name
                        }
                    });
                    if (typeof clear === 'function') clear();
                },

                /**
                 * Framework7 messagebar submit handler.
                 * Framework7 passes event.detail = { value, clear() }
                 */
                messagebarSubmit: function(event) {
                    var detail = event && event.detail ? event.detail : {};
                    var value = detail.value || '';
                    var clearFn = typeof detail.clear === 'function' ? detail.clear : null;
                    if (!value || value.trim().length === 0) return;
                    this.onSend(value, clearFn);
                }
            }
        });

        // Init Vue
        new Vue({
            el: '#app',
            data: function() {
                return states;
            },
            methods: {
                /**
                 * Gets called when user name was entered and user enters chat
                 */
                enterChat: function () {
                    if (this.name.trim().length === 0) {
                        alert('Please enter your name');
                        return false;
                    }
                    this.msgs.length = 0;
                    this.$f7.mainView.router.load({url: '/chat/'});
                    initPubNub();
                }
            },
            framework7: {
                root: '#app',
                material: Framework7.prototype.device.android ? true : false,
                routes: [{
                    path: '/chat/',
                    component: 'page-chat'
                }]
            }
        });
    }

    // Wait until device is ready and then init the app
    document.addEventListener('DOMContentLoaded', function () {
        if (Framework7.prototype.device.android) {
            Dom7('.view.navbar-through').removeClass('navbar-through').addClass('navbar-fixed');
            Dom7('.view .navbar').prependTo('.view .page');
        }

        initVue();
    }, false);

})();
