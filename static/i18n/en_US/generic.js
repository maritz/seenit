module.exports = {
  "greetings": "Hello",
  general: {
    forms: {
      errors: {
        csrf: "CSRF Check failed. You might be the victim of an attempted hack, but we foiled it for now. Please check your computer for viruses and worms.",
        notEmpty: "testasd"
      },
      labels: {
        checking: "Checking ..."
      },
      bold_hint: "<b>Bold</b> means a field is required."
    },
    name: 'Name',
    description: 'Description',
    yes: "Yes",
    no: "No",
    pagination: {
      previous: '<<',
      next: '>>'
    }
  },
  overlays: {
    login_needed: "Login",
    confirm_header: "Please confirm"
  },
  errors: {
    general_error: 'We encountered an error while trying to process your request:',
    general_error_header: 'General error',
    not_found: 'Sorry, We could not find the record you were looking for. If you got here from a link from within this page, please contact an administrator.',
    not_found_header: 'Loading failed',
    privileges_low: 'You lack the necessary privileges to perform this action.'
  },
  login_required: {
    explanation: 'To view this content you need to be logged in.',
    login_or_register: 'You can either %slog in</a> or %screate a new account</a>.',
    login_link: '',
    registration_link: ''
  }
};
