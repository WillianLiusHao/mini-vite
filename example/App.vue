<template>
  <div>
    <div style="font-size: 64px">{{ msg }}</div>
    <button @click="add">{{ num }}</button>
  </div>
</template>

<script >
import { defineComponent, ref } from "vue";

export default defineComponent({
  setup() {
    const msg = 'my mini-vite'
    const num = ref(1)
    const add = () => {
      num.value++;
    };

    return {
      msg,
      num,
      add,
    };
  },
});
</script>
