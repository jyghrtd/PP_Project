const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const port = 3000;
const cors = require("cors");
const bcrypt = require("bcryptjs");

const db = require("./db.js");

app.set("port", port);
app.use(express.json());
app.use(cors());

//메인 화면
app.get('/', (req, res) => {
    const CategoryId  = req.query.CategoryId;

    const mainIntroduce =  `SELECT Title, LecturesImageUrl, Lectures.LectureId, count(Payments.LectureId)
    from Lectures
    left join Payments on Lectures.LectureId = Payments.LectureId
    group by Lectures.LectureId
    order by count(Payments.LectureId) desc limit 4;`

    const popularLecture = `select Lectures.Title, Lectures.LecturesImageUrl, Lectures.LectureId, count(Payments.LectureId)
    from Lectures
    left join Payments on Lectures.LectureId = Payments.LectureId
    group by Lectures.LectureId
    order by count(Payments.LectureId) desc limit 6;`

    const newPost = `select PostId, PostTitle, PostType
    from post
    where PostType in (1, 2)
    order by PostId desc limit 5;`

    db.query(
        mainIntroduce, (err, rows) => {
            if(err) {
                console.log(err);
                res.status(500).send("Internal Server Error");
            }   else {
                    db.query(popularLecture, (err, popL) => {
                        if(err) {
                            console.log(err);
                            res.status(500).send("Internal Server Error");
                        } else {
                            db.query(`select Category.CategoryName, Category.CategoryParent
                            from Category;`, (err, cat) => {
                                if(err) {
                                    console.log(err);
                                    res.status(500).send("Internal Server Error");
                                }else {
                                    db.query(newPost, (err, npost) => {
                                        if(err) {
                                            console.log(err);
                                    res.status(500).send("Internal Server Error");
                                        }
                                        else {
                                            res.json(
                                                {code: 200,
                                                mainpage_element: rows,
                                                popular_element: popL,
                                                new_post: npost,
                                            categorySort: cat}
                                            );
                                        }
                                    })
                                }
                            })
                        }
                    })

                
            }
        }
    )
})

//카테고리 - 언어명 밑에 자식이 있는 것으로 변경
app.get('/category', (req, res) => {

    const CategoryParent  = req.query.CategoryParent;

    db.query(`select Category.CategoryName, Category.CategoryParent
    from Category;`, (err, cat) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다. 1');
        }   else {
                if(CategoryParent != null) {
                    db.query(`select CategoryName
                    from Category
                    where CategoryParent = ?;`, [CategoryParent], (err, lec) => {
                        if(err) {
                            console.log(err);
                            res.status(500).send('잘못된 접근입니다. 2');
                        }   else {
                            res.json(
                                {code: 200,
                                    Lecture: lec }
                            );
                        }
                    });
                }
                else {
                    res.json(
                        {code: 200,
                            category: cat}
                    );
                }
            
        }

    });
});

// 로그인
app.post('/login', (req, res) => {
    const UserId = req.body.UserId;
    const UserPassword = req.body.UserPassword;
    
    try{
            db.query(`SELECT * FROM users WHERE UserId = ?;`, [UserId], (err, rows) => {
                if (err) {
                  console.log(err);
                  res.status(500).send('로그인 실패');
                } else if(rows.length >= 1) {
                  const isPasswordCorrect = bcrypt.compareSync(UserPassword, rows[0].UserPassword);

                  if(isPasswordCorrect) { 

                    const token = jwt.sign({Id:rows[0].UserId}, "secretKey");
                    const {UserPassword, ...other} = rows[0];

                    res.cookie("access_token", token, {httpOnly: true,})
                    .status(200)
                    .json(
                        {code: 200,
                        message: "로그인 성공",
                        userInfo: other});
                    return;
                  } else {
                    console.log('Data retrieved:', rows);
                    res.json(
                        {code: 400,
                        message: "아이디 또는 비밀번호가 존재하지 않습니다.",
                        userInfo: rows={
                            "UserId": "",
                            "UserName": "",
                            "UserEmail": "",
                            "UserCellPhone": "",
                            "UserType": "",
                            "UserNickname": "",
                            "UserImage": ""
                        }}
                    );
                    return;
                  }

                }
                else {
                  console.log('Data retrieved:', rows);
                  res.json(
                      {code: 400,
                      message: "아이디 또는 비밀번호가 존재하지 않습니다.",
                      userInfo: rows={
                          "UserId": "",
                          "UserName": "",
                          "UserEmail": "",
                          "UserCellPhone": "",
                          "UserPassword": "",
                          "UserType": "",
                          "UserNickname": "",
                          "UserImage": ""
                      }}
                  );
                }
              });
    } catch(e) {
        console.log(e);
    }

    console.log(UserId, ' ', UserPassword);
  });

//회원가입
app.post('/join', (req, res) => {
    const UserId = req.body.UserId;
    const UserEmail = req.body.UserEmail;
    const UserName = req.body.UserName;
    const UserPassword = req.body.UserPassword;
    const UserNickname = req.body.UserNickname;
    const UserCellPhone = req.body.UserCellPhone;
    const UserType = req.body.UserType;
    const UserImage = req.body.UserImage;

    db.query(`select UserEmail from Users where UserEmail = ?;`, [UserEmail], (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('회원가입 실패');
        } else if(rows.length >= 1) {
            console.log("이메일이 중복됩니다.");
            res.status(400).send('이메일이 중복됩니다.');
        } else {
            db.query(`select UserId from Users where UserId = ?;`, [UserId], (err, lec) => {
                if(err) {
                    console.log(err);
                    res.status(500).send('회원가입 실패');
                } else if(lec.length > 0) {
                    console.log("아이디가 중복됩니다.");
                    res.status(400).send('아이디가 중복됩니다.');
                }
                else {
                    const salt = bcrypt.genSaltSync(10);
                    const hash = bcrypt.hashSync(UserPassword, salt);
                    db.query(`insert into Users(UserId, UserEmail, UserPassword, UserName, UserNickname, UserCellPhone, UserType, UserImage)
                    values('${UserId}', '${UserEmail}', '${hash}', '${UserName}', '${UserNickname}', '${UserCellPhone}', '${UserType}', '${UserImage}');`, (err, join) => {
                    if(err) {
                        console.log(err);
                        res.status(500).send('회원가입 실패');
                    }   else {
                        console.log('data retrieved', join);
                        res.json(
                            {code: 200,
                            message: "회원가입 성공"}
                        );
                    }
                });
                }
            })
        }
    });
});

// 강의소개 - LectureTOC문은 쪼개서 등록 - 변경완료
app.get('/explainlecture', (req, res) => {
    const LectureId = req.query.LectureId;

    const lectureSql = `select Lectures.LecturesImageUrl, Lectures.Title, Lectures.Description, Instructor.*
    from Lectures
    left join Instructor on Lectures.InstructorId = Instructor.InstructorId
    where Lectures.LectureId = ?;`

    const TOCSql = `select LectureTOC.Title, LectureTOC.Description
    from LectureTOC
    left join Lectures on Lectures.LectureId = LectureTOC.LectureId
    where LectureTOC.LectureId = ?;`

    db.query(lectureSql, [LectureId], (err, lec) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        }   else {
            db.query(TOCSql, [LectureId], (err, toc) => {
                
                if(err) {
                    console.log(err);
                    res.status(500).send('잘못된 접근입니다. 2');
                }
                else {
                    res.json(
                        {code: 200,
                        lecture_explain: lec[0],
                        LectureTOC: toc}
                    );
                }
            });
        }
    });
});

//결제정보 입력 - Lecture에 amount 넣는것 고려
app.post('/payment', (req, res) => { //PaymentDate는 now() 처리
    const UserId = req.body.UserId;
    const Amount = req.body.Amount;
    const LectureId = req.body.LectureId;
    const AttendanceRate = req.body.AttendanceRate;
    const Payment = req.body.Payment;

    db.query(`insert into Payments(UserId, Amount, PaymentDate, LectureId)
	value('${UserId}', '${Amount}', now(), '${LectureId}');`, (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.1');
        }   else {
            db.query(`insert into enrollments(UserId, LectureId, AttendanceRate, Payment)
            values (?, ?, ?, ?);`, [UserId, LectureId, AttendanceRate, Payment], (err, enrol) => {
                if(err) {
                    console.log(err);
                    res.status(500).send('잘못된 접근입니다.1');
                } else {
                    res.json(
                        {code: 200,
                            message: "결제 성공"}
                    );
                }
            })
        }
    });
});

//결제내역 출력
app.post('/payment_history', (req, res) => { //PaymentDate는 now() 처리
    const UserId = req.body.UserId;
    let query = `select payments.*, lectures.Title, lectures.StartDate, lectures.EndDate
    from payments
    left join lectures on payments.LectureId = lectures.LectureId
    where UserId = ?;`;

    db.query(query, [UserId], (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        }   else {
            res.json(
                {code: 200,
                payment_history: rows}
            );
        }
    });
});



//카테고리별 검색
app.get('/categorysearch', (req, res) => {
    const CategoryId  = req.query.CategoryId;

    db.query(`select Lectures.LecturesImageUrl, Lectures.Title, Lectures.LectureId, Lectures.Description
    from Lectures
    left join LectureCategory on Lectures.LectureId = LectureCategory.LectureId
    where LectureCategory.CategoryId = ?;`, [CategoryId], (err, cat) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다. 1');
        }   else {
                res.json(
                    {code: 200,
                    Lecture: cat}
                );
        }

    });
});

//검색어 검색
app.get('/lecturesearch', (req, res) => {
    const Title  = req.query.Title;

    db.query(`select Lectures.LecturesImageUrl, Lectures.Title, Lectures.LectureId, Lectures.Description
        from Lectures
        where lectures.Title like ?;`, [Title], (err, cat) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다. 1');
        }   else {
                res.json(
                    {code: 200,
                    Lecture: cat}
                );
        }

    });
});

//보유 강의
app.post('/mylecture', (req, res) => {
    const UserId = req.body.UserId;

    db.query(`select Lectures.LectureId, Lectures.LecturesImageUrl, Lectures.Title, Lectures.Description, Lectures.StartDate, Lectures.EndDate
    from Lectures
    left join Payments on Lectures.LectureId = Payments.LectureId
    where Payments.UserId = '${UserId}';`, (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        }   else {
            res.json(
                {code: 200,
                    mylecture: rows}
            );
        }
    });
});

//강의 페이지
app.post('/lecture', (req, res) => {
    const LectureId = req.body.LectureId;
    const UserId = req.body.UserId;

    db.query(`select Lectures.LecturesImageUrl, Lectures.Title, Lectures.Description, enrollments.AttendanceRate, instructor.*
    from Lectures
    left join enrollments on Lectures.LectureId = enrollments.LectureId
    left join instructor on Lectures.InstructorId = instructor.InstructorId
    where enrollments.LectureId = ? and enrollments.UserId = ?;`, [LectureId, UserId], (err, lec) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        }   
        //-- 여기 강의회차별 썸네일이 없는 상태
        db.query(`select LectureTOC.TOCId, LectureTOC.Title, LectureTOC.Description, LectureTOC.Thumbnail, LectureTOC.Complete
        from LectureTOC
        left join Lectures on Lectures.LectureId = LectureTOC.LectureId
        where LectureTOC.LectureId = ?;`, [LectureId], (err, toc) => {
            if(err) {
                console.log(err);
                res.status(500).send('잘못된 접근입니다.');
            }   else {
                res.json({
                    code: 200,
                    lecture: lec[0],
                    lecture_toc: toc
                })
            }
        });
    });
});

// 강의 회차별 페이지
app.post('/eachlecture', (req, res) => {
    const TOCId = req.body.TOCId;
    console.log(TOCId);

    db.query(`select TOCId, Title, Description, VideoLength, Complete, TimeProcess, MaterialType, MaterialURL
    from LectureTOC
    where TOCId = ?;`, [TOCId], (err, mat) => {
        console.log(mat);
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        }   else {
            db.query(`select UserId, InputTime, CommentInfo
            from lecturecomment
            where TOCId = ?;`, [TOCId], (err, com) => {
                if(err) {
                    console.log(err);
                    res.status(500).send('잘못된 접근입니다.');
                }   else {
                    console.log(com);
                    res.json(
                        {code: 200,
                        tocMaterial: mat[0],
                        comment: com}
                    );
                }
            });
        }
    });
});

//코멘트 가져오기
app.get('/lecturecomment', (req, res) => {
    const TOCId = req.query.TOCId;
    let query = `select LCommentId, UserId, TOCId, CommentInfo, InputTime
    from lecturecomment
    where TOCId = ?`;

    db.query(query, [TOCId], (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        }   else {
            res.json(
                {code: 200,
                    lecture_comment: rows }
            );
        }
    });
});

// 코멘트 작성
app.post('/addlecturecomment', (req, res) => {
    const UserId = req.body.UserId;
    const TOCId = req.body.TOCId;
    const CommentInfo = req.body.CommentInfo;

    console.log(UserId, TOCId, CommentInfo);

    db.query(`insert into lecturecomment(UserId, TOCId, CommentInfo, InputTime)
    value(?, ?, ?, now());`, [UserId, TOCId, CommentInfo], (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        } else {
            res.json({"code": 200,
            "message": "코멘트 작성"}
            );
        }
    });
});

//강의질문
app.get('/lecturequestion', (req, res) => { //PostType이 없이도 첫 화면을 위한 정보가 다 있음. 추가 입력이 있어야 다른 카테고리의 처리를 할 듯.
    const LectureId = req.query.LectureId;
    const UserId = req.query.UserId;
    let query = `select PostId, UserId, PostType, PostTime, Description, PostTitle, AnswerCheck, LectureId 
    from Post
    where Post.PostType = 7 and LectureId = ?`;

    if(UserId != null){
        query += ` and UserId = ${UserId}
        order by PostId desc;`;
    } else
        query += `
        order by PostId desc;`;

        console.log(query);

    db.query(query, [LectureId], (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        }   else {
            res.json(
                {code: 200,
                    lecture_question: rows }
            );
        }
    });
});

//커뮤니티 목록 - 강의별 질문 목록도 여기에 저장한다고 예정한 듯. LectureId의 존재 여부에 따라 다르게 실행하면 되는 문제이긴 하다.
//게시글 타입을 숫자가 아닌 string으로 하면 구별이 어렵지는 않을듯.
//커뮤니티 질문: Question, 강의질문: LectureQuestion 등.
//현재 1.질문글 2.강의평가 3.공지사항 4.문의사항 관련(4.계정, 5.강의, 6.결제) 7.강의질문 8.자유게시판(임시)
app.get('/community', (req, res) => { //PostType이 없이도 첫 화면을 위한 정보가 다 있음. 추가 입력이 있어야 다른 카테고리의 처리를 할 듯.
    const PostType = req.query.PostType;
    let query = `select PostId, PostTitle, UserId, PostType, PostTime
    from Post
    where LectureId is null`;

    if (PostType) {
        query += ` and PostType = '${PostType}'`;
    } else if (PostType == 4) {
        query += ` and PostType in (4,5,6)`;
    }
     else {
        query += ` and PostType in (1, 2)`;
    }   

    query += `order by PostId desc;`;

    db.query(query, (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        }   else {
            res.json(
                {code: 200,
                    community_pages: rows }
            );
        }
    });
});

//커뮤니티 개별 게시글
app.get('/communitypost', (req, res) => {
    const PostId = req.query.PostId;

    db.query(`select Post.PostTitle, Post.UserId, Post.PostType, Post.PostTime, Post.Description, Users.UserName
    from Post
    left join Users on Post.UserId = Users.UserId
    where Post.PostId = ?;`, [PostId], (err, pos) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        }

        db.query(`select UserId, WriteTime, Description
        from Comment
        where PostId = ?;`, [PostId] ,(err, com) => {
            if(err) {
                console.log(err);
                res.status(500).send('잘못된 접근입니다.');
            } else {
                res.json(
                    {code: 200,
                        community_page: pos[0],
                        comment:  com}
                );
            }
        });
    });
});

// 코멘트 작성
app.post('/addcomment', (req, res) => {
    const UserId = req.body.UserId;
    const PostId = req.body.PostId;
    const Description = req.body.Description;

    console.log(UserId, PostId, Description);

    db.query(`insert into Comment(UserId, PostId, WriteTime, Description)
	values(?, ?, now(), ?);`, [UserId, PostId, Description], (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        } else {
            res.json({"code": 200,
            "message": "코멘트 작성"}
            );
        }
    });
});

//커뮤니티글 작성
app.post('/postwrite', (req, res) => {
    const UserId = req.body.UserId;
    const PostType = req.body.PostType;
    const PostTitle = req.body.PostTitle;
    const Description = req.body.Description;
    const AnswerCheck = req.body.AnswerCheck;
    const LectureId = req.body.LectureId;
    let query = `insert into Post(UserId, PostType, PostTime, PostTitle, Description, AnswerCheck, LectureId)
	values(?, ?, now(), ?, ?, ?, ?);`;

    console.log("전송: " + query);

    db.query(query, [UserId, PostType, PostTitle, Description, AnswerCheck, LectureId], (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        } else {
            res.json({"code": 200,
            "message": "작성 완료"}
            );
        }
    });
});

//작성한 페이지로 이동
app.post('/gowritepage', (req, res) => {
    const UserId = req.body.UserId;
    const PostType = req.body.PostType;
    const PostTitle = req.body.PostTitle;
    const Description = req.body.Description;
    let query = `select PostId, PostType from post
	where UserId = ? and PostType = ? and PostTitle = ? and Description = ?
    order by PostId desc;`

    db.query(query, [UserId, PostType, PostTitle, Description], (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        } else {
            res.json({"code": 200,
            "pageId": rows[0].PostId,
        "pageType": rows[0].PostType}
            );
        }
    });
});

//마이페이지
app.get('/mypage', (req, res) => {
    const UserId = req.query.UserId;

    db.query(`select UserName, UserImage
    from Users
    where UserId = '${UserId}';`, [UserId], (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        } else {
            res.json(
                {code: 200,
                    profile: rows }
            );
        }
    });
});

//개인정보 관리
app.post('/profile', (req, res) => {
    const UserId = req.body.UserId;

    db.query(`select UserImage, UserId, UserName, UserCellPhone, UserEmail from Users where UserId = ?;`, [UserId], (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        } else {
            res.json(
                {code: 200,
                    profile: rows[0] }
            );
        }
    });
});

//닉네임 수정
app.post('/namechange', (req, res) => {
    const UserId = req.body.UserId;
    const UserNickname = req.body.UserNickname;

    db.query(`update Users
	set Users.UserNickname = ?
    where Users.UserId = ?;`, [UserNickname, UserId], (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        } else {
            res.json({"code": 200,
            "message" : "정보 변경 완료"});
        }
    });
});

//전화번호 수정
app.post('/phonechange', (req, res) => {
    const UserId = req.body.UserId;
    const UserCellPhone = req.body.UserCellPhone;

    db.query(`update Users
	set Users.UserCellPhone = ?
    where Users.UserId = ?;`, [UserCellPhone, UserId], (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        } else {
            res.json({"code": 200,
            "message" : "정보 변경 완료"});
        }
    });
});

//프로필 이미지 수정
app.post('/imgchange', (req, res) => {
    const UserId = req.body.UserId;
    const UserImage = req.body.UserImage;

    db.query(`update Users
	set Users.UserImage = ?
    where Users.UserId = ?;`, [UserImage, UserId], (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        } else {
            res.json({"code": 200,
            "message" : "정보 변경 완료"});
        }
    });
});

//비밀번호 변경
app.post('/passwordchange', (req, res) => {
    const UserId = req.body.UserId;
    const UserPassword = req.body.UserPassword;
    const ChangePassword = req.body.ChangePassword;
    const PasswordCheck = req.body.PasswordCheck;

    db.query(`select UserPassword from Users where Users.UserId = ?;`, [UserId], (err, use) => {
        const isPasswordCorrect = bcrypt.compareSync(UserPassword, use[0].UserPassword);
        console.log(isPasswordCorrect);

        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        } else if(ChangePassword != PasswordCheck){ //변경할 패스워드 체크 실패
            res.json({
                "code": 400,
                "message": "패스워드 체크 실패"
            });
        } else if(isPasswordCorrect == false) {
            res.json({
                "code": 400,
                "message": "비밀번호가 틀렸습니다."
            });
        } else {
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync(ChangePassword, salt);

            db.query(`update Users
            set Users.UserPassword = ?
            where Users.UserId = ?;`, [hash, UserId], (err, rows) => {
                if(err) {
                    console.log(err);
                    res.status(500).send('잘못된 접근입니다.');
                } else {
                    res.json({
                        "code": 200,
                        "message" : "정보 변경 완료"
                    });
                }
            });
        }
    });    
});

//내 작성글
app.post('/mypost', (req, res) => { //PostType이 없이도 첫 화면을 위한 정보가 다 있음. 추가 입력이 있어야 다른 카테고리의 처리를 할 듯.
    const UserId = req.body.UserId;
    let query = `select PostId, PostTitle, UserId, PostType, PostTime
    from Post
    where UserId = ?
    order by PostId desc;`;

    db.query(query, [UserId], (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        }   else {
            res.json(
                {code: 200,
                    my_post: rows }
            );
        }
    });
});

//고객센터
app.get('/customercenter', (req, res) => {
    db.query(`select QuestionCategory, QuestionTitle, Description
    from ServiceCenter;`, (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        } else {
            res.json({
                "code": 200,
                "customer_center" : rows
            }
            );
        }
    });
});

app.post('/myinquiry', (req, res) => { //PostType이 없이도 첫 화면을 위한 정보가 다 있음. 추가 입력이 있어야 다른 카테고리의 처리를 할 듯.
    const UserId = req.body.UserId;
    let query = `select PostId, PostTitle, UserId, PostType, PostTime, Description
    from Post
    where PostType in (4,5,6) and UserId = ?
    order by PostId desc;`;

    db.query(query, [UserId], (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        }   else {
            res.json(
                {code: 200,
                    community_pages: rows }
            );
        }
    });
});

// 공지사항 - PostType = 3
app.get('/notice', (req, res) => {
    const PostType = req.query.PostType;

    db.query(`select PostTitle, PostTime, Description
    from Post
    where PostType = ?;`, [PostType], (err, rows) => {
        if(err) {
            console.log(err);
            res.status(500).send('잘못된 접근입니다.');
        } else {
            res.json({
                "code": 200,
                "notice" : rows
            }
            );
        }
    });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
