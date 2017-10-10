# knee

Пакет предоставляет высокоуровневую модульную систему для прототипирования и создания приложений.

### Установка

```bash
npm install knee
```

### Примеры использования

1. [Простое веб-приложение](https://github.com/kneetech/knee_example_web)
1. [Приложение счётчик](https://github.com/kneetech/knee_example_counter) (используется в примерах ниже)

### Приницп работы

Система позволяет описать иерархичную структуру изолированных друг от друга модулей на этапе прототипирования приложения.

Рассмотрим процесс разработки какого либо приложения. Вне зависимости от количества разработчиков, на первом этапе
необходимо понять цель создания приложения. То есть какую задачу оно должно решать в идеале. Далее необходимо приступить
к проектированию приложения, имея в виду нашу изначальную цель. Проектировать можно как на бумаге, на доске или
непосредственно на том языке, на котором необходимо реализовать задачу.

Так вот данное средство предоставляет возможность приступить к проектированию приложения описывая его архитекруту в
формате близком к JSON. Более того, прототип можно запускать в процессе проектирования архитектуры. Другими словами
можно сказать что это прототипирование или создание приложения "на коленке".

Далее можно рассмотреть простой пример такого процесса, как проектирование приложения.

### Создание прототипа простого приложения

На первом этапе нужно сформулировать цель разработки: создание приложение, задача которого выводить в консоль состояние
некоторого счётчика, значение которого увеличивается на единицу каждую секунду.

Так же будем иметь в виду то, что не все детали нашего приложения нам сразу же ясны. И архитектура приложения тоже не
совсем понятна. Тогда для того что бы начать, мы создадим файл в котором мы будем описывать прототип нашего приложения.
То есть просто в корне проекта создадим файл `config.js` и опишем в нём прототип нашего приложения в виде модулей.

```js
module.exports = {
  // Этот объект описывает корневой модуль приложения

  // Это конструктор корневого модуля.
  // Он будет вызван когда все подмодули будут готовы к работе.
  initialize() {

    // Его задача вызвать метод `output` каждую секунду.
    setInterval(() => this.output(), 1000);
  },

  output() {
    // Здесь мы можем быть уверены в том, что свойство `counter` уже будет объявляено в this.
    console.log(this.counter.value);
  },

  modules: [{
    // А этот объект, аналогично экпортируемому объекту, тоже описывает модуль
    // но уже не корневой, а модуль который является подмодулем корневого модуля.
    
    // Данная опция указывает на то, что подмодуль нужно встроить в корневой модуль
    // под именем `counter`. То есть корневой модуль сможет обращаться к своему
    // подмодулю так `this.counter`.
    __basename: 'counter',

    // Как в корневом модуле, эта функция будет вызвана когда модуль и все его
    // компоненты, на данном уровне иерархии, будут готовы к работе.
    initialize() {
      this.value = 0;

      setInterval(() => this.inc(), 1000);
    },

    inc() {
      this.value += 1;
    }
  }]
};
```
После того, как протирип приложения был создан, можно попробовать его запустить и посмотреть что будет.

Перед тем как запустить прототип приложения, нужно понять что, запускать мы будем приложение не из рабочей директории
нашего проекта, а из директории установленного пакета `knee`. А это значит, что нам нужно указать путь к файлу прототипа
либо в виде относительного, к директории пакета, пути, либо в виде абсолютного пути. Но есть и третий путь, это объявить
переменную `NODE_PATH` и в качестве значения указать путь к нашей рабочей директории.

```bash
NODE_PATH=$(pwd) node ./node_modules/.bin/knee config
```

Вывод должен быть таким
```bash
1
2
3
...
```

### Создание простого приложения

Как мы ранее убедились, прототип-приложение со своей задачей справляется. А это значит, что можно оформить его в виде
нормального приложения, с моделями данных, библиотеками, модулями и т.п. Для этого уже можно использовать любой другой
инструментарий, но можно продолжить разрабатывать и на `knee`.

Первым делом нужно выделить описанные в структуре прототипа объекты-модули в отельные файлы-модули. Для этого нужно
создать два файла-модуля. Например, `main.js` и `counter.js` которые будут содержать реализации модулей.

```js
// main.js

const Knee = require('knee');

class Main extends Knee {
  initialize() {
    setInterval(() => this.output(), 1000);
  }
  
  output() {
    console.log(this.counter.value);
  }
}

module.exports = Main;
```

```js
// counter.js

const Knee = require('knee');

class Counter extends Knee {
  initialize() {
    this.value = 0;
    setInterval(() => this.inc(), 1000);
  }

  inc() {
    this.value += 1;
  }
}

module.exports = Counter;
```

И так, модули были вынесены в отдельные файлы, и теперь конфигурация, которая всёравно нужна, будет выглядеть так

```js
// config.js

module.exports = {
  __filename: 'main',
  
  modules: [{
    __filename: 'counter',
    __basename: 'counter'
  }]
};
```
То есть содержание этих модулей здесь уже отсутствует, осталось только описание их иерархии или структуры приложения.

### Усложнение простого приложения

Теперь, если всё понятно, можно двигаться далее и усложнить наше простое приложение. Для начала добавим возможность
конфигурирования. У приложения уже и так есть конфигурация `config.js`. Именно её и нужно использовать.

Добавим возможность устанавливать частоту вывода информации в консоль, для этого нужно добавить опцию в описание
корневого модуля.

```js
// config.js

module.exports = {
  __filename: 'main',
  
  // частота вывода информации в консоль в мс
  frequency: 500,
  
  modules: [{
    __filename: 'counter',
    __basename: 'counter'
  }]
};
```

Далее этот параметр нужно просто использовать в конструкторе корневого модуля, который ранее был вынесен в файл `main.js`.

```js
  initialize() {
    setInterval(() => this.output(), this.frequency);
  }
```

После этого вывод в консоль будет таким.

```bash
0
1
1
2
2
3
3
...
```

Отлично, теперь укажем частоту модуля по-умолчанию. Это значит сам модуль может имею свою конфигурацию по-умолчанию, а
в момент её подключения можно будет эту конфигурацию переопределить в файле конфигурации. Для начала просто вернём файл
конфигурации приложения `config.js` в предыдущее состояние. То есть удалим строку `frequency: 500`. А файле модуля
опишем параметры этого модуля по умолчанию. Сразу после того как класс `Main` был объявлен, нужно добавить следующие
строки

```js
Main.defaults = {
  frequency: 500
};
```
И после запуска можно будет убедиться что приложение сохранило свою работоспособность.

Так же, пользуясь возможностями нового JavaScript, можно определить эту конфигурацию по умолчанию другим образом.

```js
class Main extends Knee {
  static get defaults() {
    return {
      frequency: 500
    };
  }
}
```

Для простого приложения, пожалуй, хватит.

### Ещё некоторые возможности системы

В общем-то основные возможности приложения на этом и заканчиваются, но есть ещё кое что, что обязательно пригодится в
работе.

#### Возмонжности опции __basename

В примерах выше мы рассматривали только один единственный способ опубликовать подмодуль в родительском модуле: это
добавить модуль целиком в какое либо свободное свойство вышестоящего модуля. Но это не единственный способ. Рассмотрим
ещё несколько.

Предположим нужно опубликовать не весь модуль, а только одну его функцию. Если предположить что модуль `counter`
написанного нами простого приложения сам может выводить информацию о состоянии счётки в консоль. А корневой модуль `main`
только лишь знает когда её нужно выводить. В этом случае логичнее будет опубликовать функцию подмодуля в модуле `main`.

Добавим функцию которая будет выводить информацию в консоль

```js
class Counter extends Knee {
  /* ... */
  
  print() {
    console.log(this.value);
  }
}
```

В этом случае нужно будет переписать конфигурацию приложения `config.js` таким образом

```js
module.exports = {
  __filename: 'main',
  
  modules: [{
      __filename: 'counter',
      __basename: {
        output: 'print'
      }
    }]
};
```
Теперь значение опции `__basename` не строка, а объект в котором в качестве ключа `output` указано имя свойства
родительского модуля, в которое нужно опубливать, содержимое свойства, указанного в качестве значения `print` данного
модуля.

Теперь остаётся только удалить ранее определённый метод `output` в модуле `main` и можно убедиться что всё работает.
Для наглядности приведу состояние каждого модуля, если в процессе чтения не всё было понятно.

```js
// config.js

module.exports = {
  __filename: 'main',

  modules: [{
    __filename: 'counter',
    __basename: { // изменили опцию __basename
      output: 'print'
      // разумеется таких пар ключ-значение может быть много
    }
  }]
};
```

```js
// main.js

const Knee = require('knee');

class Main extends Knee {
  initialize() {
    setInterval(() => this.output(), this.frequency);
  }
  
  // удалили метод output, т.к. сейчас он будет взят из подмодуля
  // в соответствии с опцией __basename
}

Main.defaults = {
  frequency: 500
};

module.exports = Main;
```

```js
const Knee = require('knee');

class Counter extends Knee {
  initialize() {
    this.value = 0;
    setInterval(() => this.inc(), 1000);
  }

  inc() {
    this.value += 1;
  }

  // добавили метод print
  print() {
    console.log(this.value);
  }
}

module.exports = Counter;
```

И ещё один пример, того как можно опубликовать какое либо значение из подмодуля. Пример из жизни: ситуация заключается в
том, что к основному модулю подключается подмодуль, который реализует работу с БД, в данном случае, mongodb. И вот как
это можно сделать.

Для краткости опишу ситуацию в виде конфигурации, некоторого приложения.

```js
const mongodb = require('mongodb');

module.exports = {
  // корневому модулю нужно работать с БД
  
  initialize() {
    // модуль должен найти какую-то запись в БД и вывести одно
    // из свойств этой записи
    
    this.collection
      .findOne({ id: 'some id...' })
      .then((record) => console.log(record.value))
  },
  
  modules: [{
    
    __basename: {
      // в данном случае в качестве ключа используется имя функции,
      // а публикуемое значение - это результат выполнения функции.
      collection(instance) {
        // так же предусмотрено что данная функция может вернуть обещание.
        return instance.db.collection('records');
      }
    },
    
    initialize() {
      const client = new mongodb.Client();
      
      // если конструктор модуля возвращает обещание, то система
      // дождётся его выполнения и продолжит инициализацию приложения
      return new Promise(() => {
        
        // подключение к БД
        client.connect('mongodb://...', (error, db) => {
          if (error) {
            throw error;
          }
          
          // установка объекта БД в свойство данного модуля
          this.db = db;
        });
      });
    }
  }]
};
```
То есть подмодуль корневого модуля реализовал подключение к БД и опубликовал не какое либо из своих свойств, а коллекцию
из БД к которой было выполнено подключение. И корневой модуль, в свою очередь, спокойно опращается к коллекции.

Что касается работы с базой данных, то тут сразу возникает вопрос: а как использовать одно и тоже подключение к БД в
разных модулях. Не инициализировать же каждому модулю своё подключение к БД?

#### Публикация модуля в scope

Если один и тот же экземпляр того или иного модуля нужен нескольким модулям, то для такой ситуации предусмотрена
публикация модуля ещё и в scope. Scope - это некоторый глобальный объект (или реестр) модулей в котором их можно
публиковать и использовать другими модулями.

Как и в примере выше предоположим ситуацию в которой нескольким модулям нужно использовать одно и то же подключение к БД.

Для этого нужно проинициализировать модуль работы с БД, опубликовать его в scope и включить в качестве подмодуля нужным
модулям.

Пример в `config.js`

```js
module.exports = {
  // корневое приложение
  
  modules: [{
    // модуль для работы с БД
    __filename: 'db',
    
    // его параметры
    host: 'localhost',
    port: 27017,
    username: 'user',
    password: '1',
    database: 'test',
    
    // теперь его нужно опубликовать в scope, что бы
    // другие модули могли его использовать. И не стоит
    // забывать что имя должно быть уникальным
    __define: 'db'
    
    // т.к. модули инициализируются последовательно, разумеется публичный
    // модуль должен быть опубликован раньше чем его попытаются использовать.
  }, {
    // некий модуль, которму требуется работа с БД
    __filename: 'db_worker',
    
    modules: [{
      // в качестве подмодуля у определим ему
      // модуль базы данных из scope
      __inject: 'db',
      
      // не достаточно просто ключить опубликованный ранее модуль
      // в виде подмодуля, нужно ещё и указать как его требуется
      // опубликовать в модуле db_worker
      __basename: {
        collection(instance) {
          return instance.db.collection('worker_collection')
        }
      }
    }]
  }, {
    __filename: 'db_worker_too',
    
    modules: [{
      __inject: 'db',
      
      // можно опубликовать и так, если требуется опубликовать
      // только одну пару ключ-значение. Напомню что в качестве
      // ключа используется имя функции.
      __basename: function collection(instance){
        return instance.db.collection('worker_collection');
      }
    }]
  }]
};

```

#### Пару слов о __filename

Значение этой опции будет передано прямиком в `require()` без какого либо вмешательства, модификаций и проверок.

Так же стоит упомянуть что опция `__filename` менее приоритетна по отношению к `__inject`. Если обе эти опции будут
указаны в описании модуля, будет обрабатываться только опция `__inject`. Если требуемого модуля найдено не будет в scope,
то приложение упадёт с ошибкой.
