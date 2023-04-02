<template>
  <b-container>
    {{this.response}}
    <b-row class="justify-content-md-center">
      <b-form @submit.prevent="uploadFile" style="width:50%">
        <h3>Gmail bejelentkezés</h3>
        <b-form-group id="email-group" label="Email cím:" label-for="email-input" style="margin-top: 10px">
          <b-form-input id="email-input" v-model="email" type="email" required></b-form-input>
        </b-form-group>
        <b-form-group id="password-group" label="Jelszó:" label-for="password-input" style="margin-top: 10px">
          <b-form-input id="password-input" v-model="password" type="password" required></b-form-input>
        </b-form-group>
        <h3 style="margin-top: 10px">Excel feltöltés</h3>
        <b-form-group id="email-group" >
          <b-form-file
              v-model="file"
              plain
          ></b-form-file>
        </b-form-group>
        <b-button type="submit" variant="primary" style="margin-top: 10px">Feltöltés</b-button>
      </b-form>
    </b-row>
    <hr>
    <b-row style="margin-top: 20px" class="justify-content-md-center">
      <b-form @submit.prevent="uploadFile" style="width:50%">
<!--        <b-form-group id="email-group" label="Excel fájl feltöltése:" style="margin-top: 10px">-->
<!--          <b-form-file-->
<!--              v-model="file"-->
<!--              plain-->
<!--          ></b-form-file>-->
<!--        </b-form-group>-->
<!--        <b-button type="submit" variant="primary" style="margin-top: 10px" >Feltöltés</b-button>-->
      </b-form>
    </b-row>
  </b-container>
</template>

<script>
import axios from "axios";

export default {
  name: "Main-Comp",
  data() {
    return {
      email: '',
      password: '',
      file: null,
      response: ''
    }
  },
  methods: {
    uploadFile() {
      let formData = new FormData()
      formData.append('file', this.file)
      formData.append('email', this.email)
      formData.append('password', this.password)

      axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
          .then(response => {
            console.log(response.data)
            // handle the response from the server
          })
          .catch(error => {
            console.log(error)
            // handle the error
          })
    },
    async login() {
      console.log(this.email)
      console.log(this.password)
      const response = await axios.post('/api/login', {
        email: this.email,
        password: this.password
      })
      this.response = response.data.result
      // Store the token in local storage or a cookie
      // ...
    }
  }
}
</script>

<style scoped>

</style>