module.exports = {
  "greetings": "Hello",
  general: {
    forms: {
      errors: {
        csrf: "CSRF Check failed. You might be the victim of an attempted hack, but we foiled it for now. Please check your computer for viruses and worms.",
        notEmpty: "Mustn't be empty.",
        email: "Invalid email format. (if this is a false-positive please free to tell us)",
        length: "Needs to be longer or shorter. Not sure which.",
        notUnique: "This must be unique. Sadly your input is already used, please change it."
      },
      labels: {
        checking: "Checking ..."
      },
      bold_hint: "<b>Bold</b> means a field is required."
    },
    name: 'Name',
    description: 'Description',
    yes: "Yes",
    no: "No"
  },
  overlays: {
    login_needed: "Login",
    confirm_header: "Please confirm"
  },
  errors: {
    not_found: 'Sorry, We could not find the record you were looking for. If you got here from a link from within this page, please contact an administrator.',
    not_found_header: 'Loading failed'
  }
};
