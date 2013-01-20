/*
* imo Hackathon Playground
* Kyle Smith @knksmith57
* Evan Noon @epnoon
*/

var

app = {

   // app vars
   channel : null,
   connected : false,
   user : null,
   users : null,
   new_users : {},
   owner : false,
   timer : null,
   lastPos : 0,
   code_params: { old_vars : {}, vars : {} },

   // DOM vars
   $userInfo : null,
   $usersList : null,
   $editor : null,
   $chat : null,

   // app methods
   get_user_info : function(callback) {
      var that = this, info = {};
      
      that.$userInfo.modal('show').find('#firstName').focus();

      // hack to emulate return for submit
      that.$userInfo.find('input').keydown(function(event) {
         if(event.which == 13) {
            that.$userInfo.find('button').click();
         }
      })
   
      // crappy form validation code
      that.$userInfo.find('button').click(function() {
         var $fn = $('#firstName'), $ln = $('#lastName');

         // remove all the old warnings
         $('#profile_warning').find('.alert').remove();

         // make sure fields are completely empty
         if( $fn.val() == "" ) {
            $('#profile_warning').append('<div class="alert alert-error"><strong>Error!</strong> you must enter a first name</div>')
         }
         else if( $ln.val() == "" ) {
            $('#profile_warning').append('<div class="alert alert-error"><strong>Error!</strong> you must enter a last name</div>')
         }
         else {
            // everything looks OK!
            info.first_name = $fn.val();
            info.last_name = $ln.val();
            // info.icon_url = "http://www.gravatar.com/avatar/fed2e6b32b1922e305c0de7a80a3a212.png" // or could use localhost for this
            that.user = info;
            that.user.id = that.channel.get_public_client_id()
            that.$userInfo.modal('hide');
            callback.call(that);
         }
      })
   },
   
   log_in : function() {
      var that = this;
      that.get_user_info(that.connect_user);
   }, // end log_in

   connect_user : function() {
      var that = this;

      console.log(that.channel);

      that.users = new IMO.UserList({
         "title" : "Users",
         "public_client_id" : that.user.id
      });
      
      // custom implementation of users list
      // that.$usersList.append(that.users.div);
      

      // Subscribe to the chat event queue, to receive all past and future messages.
      that.channel.subscribe(
         [  
            {  // listen for people logging in / out
               "type" : "event_queue",
               "name" : "imo.clients"
            },
            {  // listen for code changes
               "type": "event_queue", 
               "name": "code"
            },
            {  // listen for chat updates
               "type": "event_queue", 
               "name": "chat"
            },
         ],   
         0  // min_stamp == starting point to receive messages from the queue. if negative, no past events will be sent
      );
   },

   send_event : function(queueName, messageObj) {
      var that = this;

      that.channel.event_queue(
         queueName, {         
            "object" : messageObj
         }
      );
   }, // end send_message

   send_profile_info : function() {
      var that = this;
      // Send event with users profile info to other users
      that.channel.event_queue(
         "chat", {
            "object": {
               "type": "profile_info",
               "value": that.user
            }
         }
      );
   },

   send_message : function(messageText) {
      return this.send_event("chat", { type: "message", value: messageText });
   },
   
   send_code_start : function(cursorPos) {
      return this.send_event("code", { type: "type_start", value: { cursor_pos: cursorPos } });
   },
   
   send_code_finish : function(cursorPos) {
      return this.send_event("code", { type: "type_finish", value: { cursor_pos: cursorPos } });
   },

   send_code_update : function(codeText, cursorPos) {
      return this.send_event("code", { type: "update", value: { text: codeText, cursor_pos: cursorPos } });
   },

   connect : function() {
      var 
      that = this,
      client = {
         connect: function() {
            console.log("channel connected");
            that.connected = true;

            // once connected, log in
            that.log_in();
         },

         event_queue: function(name, eventObj) {

            console.log("New event: " + name + " (" + eventObj.object.type + ")");

            // did a user just join / re-join?
            if (name == "imo.clients") {
               that.send_profile_info();

               if (that.users.add_user(eventObj) == "join") {
                  console.log("New user: " + eventObj.setter)
                  that.new_users[eventObj.setter] = "logged in";
               }
               else {
                  console.log("User returned: " + eventObj.setter)
                  that.new_users[eventObj.setter] = "returned";
               }
            }

            // was a chat message sent?
            else if (name == "chat") {
               console.log(eventObj.object);
               
               if(eventObj.object.type == "message") {
                  // who sent it?
                  var author = eventObj.setter == that.user.id ? 'me' : that.users.get_data(eventObj.setter, 'first_name') + ' ' + that.users.get_data(eventObj.setter, 'last_name');
                  $('#view textarea').attr('rows', parseInt($('#view textarea').attr('rows')) + 1).append(author + ': ' + eventObj.object.value);
               }
               else if(eventObj.object.type == "profile_info") {
                  console.log("setting profile info for: " + eventObj.setter)
                  that.users.users[eventObj.setter].data = {
                     'first_name'   : eventObj.object.value.first_name,
                     'last_name'    : eventObj.object.value.last_name,
                     'icon_url'     : eventObj.object.value.icon_url
                  }

                  // check if we should announce the user
                  if(that.new_users[eventObj.setter]) {
                     var author = that.users.get_data(eventObj.setter, 'first_name') + ' ' + that.users.get_data(eventObj.setter, 'last_name');
                     if(eventObj.setter == that.user.id) {
                        author += ' (you)';
                     }

                     $('#view textarea').attr('rows', parseInt($('#view textarea').attr('rows')) + 1).append(author + " has just " + that.new_users[eventObj.setter] + "\n");
                     // now remove from the announcement queue
                     delete that.new_users[eventObj.setter] 
                  }
               }
            }

            // was a code change sent?
            else if (name == "code") {
               // code queue logic here
               if(eventObj.setter != that.user.id) {
                  // someone else is sending code logic 
                  if(eventObj.object.type == "type_start") {
                     // disable editing
                     that.$editor.attr('readonly', true);
                  }
                  else if(eventObj.object.type == "type_finish") {
                     // re-enable editing
                     that.$editor.attr('readonly', false);
                  }
                  else if(eventObj.object.type == "update") {
                     // update code content
                     that.$editor.val(eventObj.object.value.text);
                  }
                  
                  that.lastPos = eventObj.object.value.cursor_pos;
               }
               else if(eventObj.object.type == "type_finish") {
                  that.lastPos = eventObj.object.value.cursor_pos;
               }

               // now handle announcements
               if(eventObj.object.type == "type_finish") {
                  
               }

               console.log("new cursor pos: " + that.lastPos);
               if( ! that.owner && eventObj.setter != that.user.id ) {
                  that.$editor.selectRange(that.lastPos, that.lastPos);
               }
            }
         },

         subscribe_done : function() {
            console.log("queue is up to date!");
         }
      };

      return new IMO.Channel(client);
   }, // end connect

   init : function() {
      var that = this;

      // set up DOM connections
      that.$userInfo = $('#user_info').modal({
         backdrop : 'static',
         keyboard : false,
      }).modal('hide');

      that.$chat = $('#input textarea').keydown(function(event) {
         if(event.which == 13) {
            // entered text in chat input box, send it 
            event.preventDefault();
            that.send_message($('#input textarea').val() + "\n");
            $('#input textarea').val('');
         }
      });
      
      that.$editor = $("#codearea");

      that.$editor
      .on('focus', function() {
         console.log("got focus! moving cursor to: " + that.lastPos);
         var $this = $(this).selectRange(that.lastPos, that.lastPos);
         $this.data('before', $this.val());
         return $this;
      })
      .on('blur keyup paste', function(event) {
         console.log('got blur, keyup, paste!');
          var $this = $(this);
          if (($this.data('before') !== $this.val()) || event.type == 'keyup' && that.connected) {
              $this.data('before', $this.val());
              $this.trigger('change');
          }
          return $this;
      })
      // from http://stackoverflow.com/questions/9950894/adding-tabs-to-textareas-using-javascript
      .keydown(function(e) {
         var $this, end, start;
         if (e.keyCode === 9) {
            start = this.selectionStart;
            end = this.selectionEnd;
            $this = $(this);
            $this.val($this.val().substring(0, start) + "\t" + $this.val().substring(end));
            // $this.val($this.val().substring(0, start) + "   " + $this.val().substring(end));
            this.selectionStart = this.selectionEnd = start + 1;
            return false;
         }
      })
      .on('change', function() {
         console.log("changed!") 
         if(that.owner) {
            that.send_code_update($(this).val(), $(this).getCursorPosition());
         }
         else {
            that.send_code_start(that.lastPos);
            that.owner = true;
         }

         var self = this;

         clearTimeout(that.timer);
         that.timer = setTimeout(function() {
            that.owner = false;
            that.send_code_update($(self).val(), $(self).getCursorPosition());
            that.send_code_finish($(self).getCursorPosition()); 
         }, 600);

      });
      
      // Connect to the API channel.
      that.channel = that.connect();
      that.channel.debug_mode(true);
   } // end init
}


$(function() {
   // on doc ready, init app
   app.init();
})
