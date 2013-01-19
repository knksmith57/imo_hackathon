/*
* imo Hackathon Playground
* Kyle Smith @knksmith57
* Evan Noon @epnoon
*/

var

app = {

   // app vars
   channel : null,
   user : null,
   users : null,
   owner : false,
   timer : null,

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
   
   send_code_start : function() {
      return this.send_event("code", { type: "type_start", value: null });
   },
   
   send_code_finish : function() {
      return this.send_event("code", { type: "type_finish", value: null });
   },

   send_code_update : function(codeText) {
      return this.send_event("code", { type: "update", value: codeText });
   },

   connect : function() {
      var 
      that = this,
      client = {
         connect: function() {
            console.log("channel connected");

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
               }
               else {
                  console.log("User returned: " + eventObj.object.first_name)
                  console.log(eventObj)
               }
               
               // update my user data in the users list
               if(eventObj.setter == that.user.id) {
                  console.log("Setting my data! I'm " + that.user.id)
               }
            }

            // was a chat message sent?
            else if (name == "chat") {
               console.log(eventObj.object);
               
               if(eventObj.object.type == "message") {
                  // who sent it?
                  var author = eventObj.setter == that.user.id ? 'me' : that.users.get_data(eventObj.setter, 'first_name') + ' ' + that.users.get_data(eventObj.setter, 'last_name');
                  $('#chat_box').attr('rows', parseInt($('#chat_box').attr('rows')) + 1).append(author + ': ' + eventObj.object.value);
               }
               else if(eventObj.object.type == "profile_info") {
                  console.log("setting profile info for: " + eventObj.setter)
                  that.users.users[eventObj.setter].data = {
                     'first_name'   : eventObj.object.value.first_name,
                     'last_name'    : eventObj.object.value.last_name,
                     'icon_url'     : eventObj.object.value.icon_url
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
                     that.$editor.attr('contenteditable', false);
                  }
                  else if(eventObj.object.type == "type_finish") {
                     // re-enable editing
                     that.$editor.attr('contenteditable', true);
                  }
                  else if(eventObj.object.type == "update") {
                     // update code content
                     that.$editor.html(eventObj.object.value);
                  }
               }
                     
               that.$viewer.html(eventObj.object.value);
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


      that.$chat = $('#chat_input').keydown(function(event) {
         if(event.which == 13) {
            // entered text in chat input box, send it 
            event.preventDefault();
            that.send_message($('#chat_input').val() + "\n");
            $('#chat_input').val('');
         }
      });
      
      that.$viewer = $("#code_view");
      that.$editor = $("#code_container");

      that.$editor
      .on('focus', function() {
          var $this = $(this);
          $this.data('before', $this.html());
          return $this;
      })
      // .on('keydown', function() {
      //  key hold for backspace / repeating keys
      // })
      .on('blur keyup paste', function() {
          var $this = $(this);
          if ($this.data('before') !== $this.html()) {
              $this.data('before', $this.html());
              $this.trigger('change');
          }
          return $this;
      })
      .on('blur', function() {
         console.log('on blur!');
         var $this = $(this);
         $this.hide();
         that.$viewer.show();
      })
      .change(function() {
         console.log("changed!") 
         if(that.owner) {
            that.send_code_update($(this).html());
         }
         else {
            that.send_code_start();
            that.owner = true;
         }

         var self = this;

         clearTimeout(that.timer);
         that.timer = setTimeout(function() {
            that.owner = false;
            that.send_code_update($(self).html());
            that.send_code_finish(); 
         }, 600);

      });
      
      that.$viewer
      .on('focus', function() {
         var $this = $(this);
         $this.hide();
         that.$editor.show().focus()
      })

      that.$usersList = $("#users_list_container").change(function() {
         console.log('changed!') ;
      })
      
      // Connect to the API channel.
      that.channel = that.connect();
      that.channel.debug_mode(true);


      
   } // end init
}


$(function() {
   // on doc ready, init app
   app.init();
})
