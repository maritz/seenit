module.exports = {
  general: {
    forms: {
      errors: {
        name_taken: "This username is already taken. Please choose a different one.",
        password_mismatch: "Passwords do not match.",
        minLength: "Password is too short. Please use at least 6 characters."
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
    profile: "Profile",
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
    legend: "Your basic information"
  }
};
