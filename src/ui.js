import { h, reactive } from 'vue'
import { createDiscreteApi, darkTheme, NInput } from 'naive-ui'

// The app ships a dark theme, so naive's dialogs and toasts must match it
// instead of falling back to the light defaults.
const themeOverrides = {
  common: {
    primaryColor: '#5e6ad2',
    primaryColorHover: '#727ee4',
    primaryColorPressed: '#4d58c4',
    primaryColorSuppl: '#727ee4',
    infoColor: '#5e6ad2',
    infoColorHover: '#727ee4',
    infoColorPressed: '#4d58c4',
    infoColorSuppl: '#727ee4',
    borderRadius: '8px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
  },
  Dialog: {
    color: '#14171b',
    borderRadius: '12px',
    titleTextColor: '#f2f4f6',
    textColor: '#a7aeb8'
  },
  Message: {
    color: '#1a1d21',
    colorInfo: '#1a1d21',
    colorSuccess: '#1a1d21',
    colorError: '#1a1d21',
    colorWarning: '#1a1d21',
    colorLoading: '#1a1d21',
    textColor: '#f2f4f6',
    textColorInfo: '#f2f4f6',
    textColorSuccess: '#f2f4f6',
    textColorError: '#f2f4f6',
    textColorWarning: '#f2f4f6',
    textColorLoading: '#f2f4f6',
    boxShadow: '0 12px 30px rgba(0, 0, 0, .5)'
  },
  Button: {
    textColorPrimary: '#fff',
    textColorHoverPrimary: '#fff',
    textColorPressedPrimary: '#fff',
    textColorFocusPrimary: '#fff',
    textColorError: '#fff',
    textColorHoverError: '#fff',
    textColorPressedError: '#fff',
    textColorFocusError: '#fff'
  },
  Input: {
    color: '#0e1013',
    colorFocus: '#0e1013',
    border: '1px solid #262a30',
    borderHover: '1px solid #343a42',
    borderFocus: '1px solid #5e6ad2',
    boxShadowFocus: '0 0 0 3px rgba(94, 106, 210, .22)'
  }
}

const { message, dialog, loadingBar } = createDiscreteApi(['message', 'dialog', 'loadingBar'], {
  configProviderProps: { theme: darkTheme, themeOverrides }
})

// Rendered inside the dialog so the input keeps its own reactivity.
const PromptBody = {  props: {
    text: String,
    placeholder: String,
    state: Object,
    onSubmit: Function
  },
  setup(props) {
    return () => h('div', { class: 'hx-dialog' }, [
      props.text
        ? h('p', { class: 'hx-dialog-msg' }, props.text)
        : null,
      h(NInput, {
        value: props.state.value,
        'onUpdate:value': (v) => {
          props.state.value = v
          props.state.error = ''
        },
        placeholder: props.placeholder,
        autofocus: true,
        onKeydown: (e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            props.onSubmit()
          }
        }
      }),
      props.state.error
        ? h('p', { class: 'hx-dialog-err' }, props.state.error)
        : null
    ])
  }
}

/**
 * Promise-based replacement for window.prompt.
 * Resolves with the trimmed string, or null when cancelled.
 */
export function prompt(options = {}) {
  const {
    title = 'Input',
    text = '',
    placeholder = '',
    defaultValue = '',
    positiveText = 'OK',
    negativeText = 'Cancel',
    required = true,
    validate = null
  } = options

  return new Promise(resolve => {
    const state = reactive({ value: String(defaultValue ?? ''), error: '' })
    let settled = false
    let instance = null

    const finish = (value) => {
      if (!settled) {
        settled = true
        resolve(value)
      }
    }

    const submit = () => {
      const value = state.value.trim()
      if (!value && required) {
        state.error = 'This field is required'
        return false
      }
      if (validate) {
        const problem = validate(value)
        if (problem) {
          state.error = problem
          return false
        }
      }
      finish(value)
      return true
    }

    instance = dialog.info({
      title,
      content: () => h(PromptBody, {
        text,
        placeholder,
        state,
        onSubmit: () => {
          if (submit()) {
            instance.destroy()
          }
        }
      }),
      positiveText,
      negativeText,
      onPositiveClick: () => submit(),
      onNegativeClick: () => finish(null),
      onClose: () => finish(null),
      onMaskClick: () => finish(null)
    })
  })
}

const PairBody = {
  props: { text: String, fields: Array, state: Object, onSubmit: Function },
  setup(props) {
    return () => h('div', { class: 'hx-dialog' }, [
      props.text
        ? h('p', { class: 'hx-dialog-msg' }, props.text)
        : null,
      h('div', { class: 'hx-dialog-row' }, props.fields.map((field, index) => h('label', {
        class: 'hx-dialog-field',
        key: field.key
      }, [
        h('span', { class: 'hx-dialog-label' }, field.label),
        h(NInput, {
          value: props.state.values[field.key],
          'onUpdate:value': (v) => {
            props.state.values[field.key] = v
            props.state.error = ''
          },
          placeholder: field.placeholder || '',
          autofocus: index === 0,
          onKeydown: (e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              props.onSubmit()
            }
          }
        })
      ]))),
      props.state.error
        ? h('p', { class: 'hx-dialog-err' }, props.state.error)
        : null
    ])
  }
}

/**
 * One dialog with several inputs laid out side by side.
 * Resolves with `{ key: value }` for every field, or null when cancelled.
 */
export function promptPair(options = {}) {
  const {
    title = 'Input',
    text = '',
    fields = [],
    positiveText = 'OK',
    negativeText = 'Cancel',
    validate = null
  } = options

  return new Promise(resolve => {
    const initial = {}
    fields.forEach(field => {
      initial[field.key] = String(field.defaultValue ?? '')
    })
    const state = reactive({ values: initial, error: '' })
    let settled = false
    let instance = null

    const finish = (value) => {
      if (!settled) {
        settled = true
        resolve(value)
      }
    }

    const submit = () => {
      if (fields.length === 0) {
        finish(null)
        return true
      }
      const values = {}
      for (const field of fields) {
        const raw = String(state.values[field.key] ?? '').trim()
        if (!raw) {
          state.error = 'Fill in every field'
          return false
        }
        values[field.key] = raw
      }
      if (validate) {
        const problem = validate(values)
        if (problem) {
          state.error = problem
          return false
        }
      }
      finish(values)
      return true
    }

    instance = dialog.info({
      title,
      content: () => h(PairBody, {
        text,
        fields,
        state,
        onSubmit: () => {
          if (submit()) {
            instance.destroy()
          }
        }
      }),
      positiveText,
      negativeText,
      onPositiveClick: () => submit(),
      onNegativeClick: () => finish(null),
      onClose: () => finish(null),
      onMaskClick: () => finish(null)
    })
  })
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (e) {
    // fall through to the legacy path
  }
  let area;
  try {
    area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.top = '-1000px'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    return document.execCommand('copy')
  } catch (e) {
    return false
  } finally {
    if (area && area.parentNode) {
      area.parentNode.removeChild(area)
    }
  }
}

/**
 * Shows a ready-to-use link: a read-only field for copying and a real
 * clickable anchor that opens the URL in a new tab.
 */
export function linkDialog(options = {}) {
  const {
    title = 'Link',
    text = '',
    url = '',
    positiveText = 'Copy'
  } = options

  const LinkBody = {
    props: { text: String, url: String },
    setup(props) {
      const safeUrl = /^https?:\/\//i.test(props.url) ? props.url : null;
      return () => h('div', { class: 'hx-dialog' }, [
        props.text
          ? h('p', { class: 'hx-dialog-msg' }, props.text)
          : null,
        safeUrl
          ? h('a', {
              class: 'hx-link-field',
              href: safeUrl,
              target: '_blank',
              rel: 'noopener noreferrer',
            }, safeUrl)
          : h('span', { class: 'hx-link-field' }, props.url)
      ])
    }
  }

  const safeUrl = /^https?:\/\//i.test(url) ? url : null

  return new Promise(resolve => {
    let settled = false
    const finish = (value) => {
      if (!settled) {
        settled = true
        resolve(value)
      }
    }

    dialog.info({
      title,
      content: () => h(LinkBody, { text, url }),
      positiveText,
      onPositiveClick: async () => {
        const copied = safeUrl ? await copyToClipboard(safeUrl) : false
        if (copied) {
          message.success('Link copied to clipboard')
          finish(url)
          return true
        }
        // Keep the dialog open with the link selected so it can be copied by hand.
        const node = document.querySelector('.hx-link-field')
        if (node && window.getSelection) {
          const range = document.createRange()
          range.selectNodeContents(node)
          const selection = window.getSelection()
          selection.removeAllRanges()
          selection.addRange(range)
        }
        message.warning('Copying is blocked here \u2014 the link is selected, copy it manually')
        return false
      },
      onClose: () => finish(null),
      onMaskClick: () => finish(null)
    })
  })
}

/**
 * Promise-based replacement for window.confirm.
 * Resolves true when confirmed, false otherwise.
 */
export function confirmAction(options = {}) {
  const {
    title = 'Are you sure?',
    content = '',
    positiveText = 'Confirm',
    negativeText = 'Cancel',
    type = 'info'
  } = options

  return new Promise(resolve => {
    let settled = false
    const finish = (value) => {
      if (!settled) {
        settled = true
        resolve(value)
      }
    }
    const method = type === 'error' ? dialog.error
        : type === 'warning' ? dialog.warning
        : type === 'success' ? dialog.success
        : dialog.info
    method.call(dialog, {
      title,
      content,
      positiveText,
      negativeText,
      onPositiveClick: () => finish(true),
      onNegativeClick: () => finish(false),
      onClose: () => finish(false),
      onMaskClick: () => finish(false)
    })
  })
}

export { message, dialog, loadingBar }
