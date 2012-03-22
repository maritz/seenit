module.exports = {
  general: {
    forms: {
      errors: {
        name_taken: "This username is already taken. Please choose a different one.",
        password_mismatch: "Passwords do not match.",
        minLength: "Password is too short. Please use at least 6 characters.",
        wrong_login: "These login credentials are incorrect."
      },
      labels: {
        name: "User name",
        password: "Password",
        password_repeat: "Repeat password",
        email: "E-Mail"
      },
      login: "Log in",
      submit: "Submit changes"
    },
    
    login_legend: 'Please log in to use all features of this Page. '+
      '<br/>If you do not have an account yet, you may <a href="#user/register" onclick="app.closeOverlay()">create one here</a>.',
      
    register: "Sign Up",
    view_profile: "View Profile",
    edit_profile: "Update profile",
    list: "Index",
    login: "Log in",
    logout: "Log out"
  },
  register: {
    headline: "Registration",
    legend: "Your basic information",
    forms: {
      submit: "Sign Up"
    }
  },
  edit_profile: {
    headline: "Edit profile",
    legend: "Your basic information",
    admin: {
      legend: "Administrator",
      label: "Administrator - BE&nbsp;CAREFUL",
      label_info: "Be careful who you give this to, admins can edit everything",
      grant_warning: "You're about to give the user \"%s\" admin rights.<br/>He will have the rights to change every data that is changable over the API, including taking away or giving admin to other users (including you!).<br/><br/>Are you sure?",
      self_warning: "You're about to take your own admin privileges. You will not be able to regain these by yourself!<br/><br/>Are you sure?"
    },
    acl: {
      legend: 'Access List',
      User: 'User Management',
      Show: 'Show Management',
      Episode: 'Episode Management',
      
      read: 'Toggle read rights',
      write: 'Toggle write rights',
      
      self: 'May view/edit/delete himself and contents defined as his contents',
      view: 'May view any',
      list: 'May request a list of all',
      create: 'May create new',
      edit: 'May edit any',
      'delete': 'May delete any',
      grant: 'May grant others any right (careful!)'
    }
  }
};
