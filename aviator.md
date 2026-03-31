# 内置函数列表

------

### 操作符列表

| 序号 | 操作符    | 结合性   | 操作数限制                                                   |
| ---- | --------- | -------- | ------------------------------------------------------------ |
| 0    | () [ ]    | 从左到右 | ()用于函数调用，[ ]用于数组和java.util.List的元素访问，要求[indx]中的index必须为整型 |
| 1    | ! - ~     | 从右到左 | ! 能用于Boolean,- 仅能用于Number,~仅能用于整数               |
| 2    | * / %     | 从左到右 | Number之间                                                   |
| 3    | + -       | 从左到右 | + - 都能用于Number之间, + 还能用于String之间，或者String和其他对象 |
| 4    | << >> >>> | 从左到右 | 仅能用于整数                                                 |
| 5    | < <= > >= | 从左到右 | Number之间、String之间、Pattern之间、变量之间、其他类型与nil之间 |
| 6    | == != =~  | 从左到右 | ==和!=作用于Number之间、String之间、Pattern之间、变量之间、其他类型与nil之间以及String和java.util.Date之间，=~仅能作用于String和Pattern之间 |
| 7    | &         | 从左到右 | 整数之间                                                     |
| 8    | ^         | 从左到右 | 整数之间                                                     |
| 9    | ¦         | 从左到右 | 整数之间                                                     |
| 10   | &&        | 从左到右 | Boolean之间，短路                                            |
| 11   | ¦¦        | 从左到右 | Boolean之间，短路                                            |
| 12   | ? :       | 从右到左 | 第一个操作数的结果必须为Boolean，第二和第三操作数结果无限制  |

### 内置函数

| 函数名称                                  | 说明                                                         |
| ----------------------------------------- | ------------------------------------------------------------ |
| sysdate()                                 | 返回当前日期对象java.util.Date                               |
| rand()                                    | 返回一个介于0-1的随机数，double类型                          |
| print([out],obj)                          | 打印对象，如果指定out，向out打印，否则输出到控制台           |
| println([out],obj)                        | 与print类似，但是在输出后换行                                |
| now()                                     | 返回System.currentTimeMillis                                 |
| long(v)                                   | 将值的类型转为long                                           |
| double(v)                                 | 将值的类型转为double                                         |
| str(v)                                    | 将值的类型转为string                                         |
| date_to_string(date,format)               | 将Date对象转化化特定格式的字符串,2.1.1新增                   |
| string_to_date(source,format)             | 将特定格式的字符串转化为Date对象,2.1.1新增                   |
| string.contains(s1,s2)                    | 判断s1是否包含s2，返回Boolean                                |
| string.length(s)                          | 求字符串长度,返回Long                                        |
| string.startsWith(s1,s2)                  | s1是否以s2开始，返回Boolean                                  |
| string.endsWith(s1,s2)                    | s1是否以s2结尾,返回Boolean                                   |
| string.substring(s,begin[,end])           | 截取字符串s，从begin到end，end如果忽略的话，将从begin到结尾，与java.util.String.substring一样。 |
| string.indexOf(s1,s2)                     | java中的s1.indexOf(s2)，求s2在s1中的起始索引位置，如果不存在为-1 |
| string.split(target,regex,[limit])        | Java里的String.split方法一致,2.1.1新增函数                   |
| string.join(seq,seperator)                | 将集合seq里的元素以seperator为间隔连接起来形成字符串,2.1.1新增函数 |
| string.replace_first(s,regex,replacement) | Java里的String.replaceFirst 方法，2.1.1新增                  |
| string.replace_all(s,regex,replacement)   | Java里的String.replaceAll方法 ，2.1.1新增                    |
| math.abs(d)                               | 求d的绝对值                                                  |
| math.sqrt(d)                              | 求d的平方根                                                  |
| math.pow(d1,d2)                           | 求d1的d2次方                                                 |
| math.log(d)                               | 求d的自然对数                                                |
| math.log10(d)                             | 求d以10为底的对数                                            |
| math.sin(d)                               | 正弦函数                                                     |
| math.cos(d)                               | 余弦函数                                                     |
| math.tan(d)                               | 正切函数                                                     |
| map(seq,fun)                              | 将函数fun作用到集合seq每个元素上，返回新元素组成的集合       |
| filter(seq,predicate)                     | 将谓词predicate作用在集合的每个元素上，返回谓词为true的元素组成的集合 |
| count(seq)                                | 返回集合大小                                                 |
| include(seq,element)                      | 判断element是否在集合seq中，返回boolean值                    |
| sort(seq)                                 | 排序集合，仅对数组和List有效，返回排序后的新集合             |
| reduce(seq,fun,init)                      | fun接收两个参数，第一个是集合元素，第二个是累积的函数，本函数用于将fun作用在集合每个元素和初始值上面，返回最终的init值 |
| seq.eq(value)                             | 返回一个谓词，用来判断传入的参数是否跟value相等,用于filter函数，如filter(seq,seq.eq(3)) 过滤返回等于3的元素组成的集合 |
| seq.neq(value)                            | 与seq.eq类似，返回判断不等于的谓词                           |
| seq.gt(value)                             | 返回判断大于value的谓词                                      |
| seq.ge(value)                             | 返回判断大于等于value的谓词                                  |
| seq.lt(value)                             | 返回判断小于value的谓词                                      |
| seq.le(value)                             | 返回判断小于等于value的谓词                                  |
| seq.nil()                                 | 返回判断是否为nil的谓词                                      |
| seq.exists()                              | 返回判断不为nil的谓词                                        |

### 常量和变量

| 值       | 说明                                                         |
| -------- | ------------------------------------------------------------ |
| true     | 真值                                                         |
| false    | 假值                                                         |
| nil      | 空值                                                         |
| `$digit` | 正则表达式匹配成功后的分组，`$0`表示匹配的字符串，`$1`表示第一个分组 etc. |