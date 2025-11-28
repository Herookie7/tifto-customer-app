let navObj = null

function setGlobalRef(ref) {
  navObj = ref
}

function navigate(path, props = {}) {
  if (!navObj) {
    console.error('Navigation not initialized. Cannot navigate to:', path)
    return
  }
  try {
  navObj.navigate(path, props)
  } catch (error) {
    console.error('Navigation error:', error, 'Path:', path, 'Props:', props)
  }
}

function goBack() {
  if (!navObj) {
    console.error('Navigation not initialized. Cannot go back.')
    return
  }
  try {
  navObj.goBack()
  } catch (error) {
    console.error('Navigation goBack error:', error)
  }
}

export default {
  setGlobalRef,
  navigate,
  goBack
}
